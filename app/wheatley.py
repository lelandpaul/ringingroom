"""
A module to contain all the code relating to the interactions of Ringing Room with Wheatley.  All
the technical details are contained in this file and the Wheatley class, and the rest of the code
should only interact with the provided functions.  This provides a separation of concerns, and
allows the Wheatley interfacing code to be adjusted easily to keep up with changes to Wheatley
itself.

# Code overview

## Goals

The biggest concern of this module is to guaruntee the following properties:
- At any time, there is **at most one** Wheatley instance active in any given tower
- After enough inactivity, there should be no Wheatley instances running
- When Wheatley is needed for some ringing, there is _exactly one_ Wheatley instance running in time
  for the start of the ringing (note that this a Wheatley instance is not required immediatley after
  `Look To`, only at the start of the ringing).

## Why I think this system will actually work

This system is makes a number of improvements over the last (broken) system to make it more paranoid
and less likely to fail:

1.  This system never forgets about Wheatley processes.  Therefore, it is explicitly able to recover
    from the situation where multiple Wheatleys exist in the same tower. The old system could only
    track at most one Wheatley in a given room, despite the fact that mistakes sometimes happen -
    this meant that if a 2nd Wheatley instance did somehow appear, the first one would be forgotten
    about forever, leaving it as a 'zombie Wheatley' to mess up the ringing and consume the CPU of
    the RR server.

2.  Secondly, this system detects active Wheatley instances by requiring them to send a WebSocket
    signal (`c_roll_call`) in reply to `Look To`.  This means that if a Wheatley process is running
    but somehow unable to send/recieve socketio messages then it is wasting CPU and memory time and
    will be killed.

3.  Apart from the inactivity timeout, Wheatley instances are always killed by the RR server
    explicitly killing the Wheatley process.  This means that however much a Wheatley instance gets
    its knickers in a twist, we will always be able to kill it.

4.  Wheatley process classes (`Proc`s) are only pronounced to be `STATE_DEAD` when the process
    actually terminates.

5.  This system only creates new Wheatleys if it's absolutely necessary, minimising the number of
    CPU spikes caused by spinning up new python interpreters.

## How the system works

If `Look To` is called and Wheatley is assigned, then a Wheatley instance is needed.  Importantly,
Wheatley is not needed until the 'Look To' sound is finished, giving us ~3 seconds to make sure that
exactly one Wheatley process is active.

However, detecting active Wheatley instances purely by which processes are running is **very**
unreliable (knowledge that we have learned through much trauma with the dev server).  Instead, we
require that Wheatley and the server follow a standard protocol, with the following timeline:

1.  `Look To` is called, and Wheatley is assigned to some bells - Wheatley therefore needs to start
    ringing when `Look To` is finished.  The `Wheatley` class stores the current time in
    `Wheatley._look_to_time` so that any new Wheatleys know when to start ringing.  Nothing else
    happens.

2.  Any active Wheatley instances reply to the `Look To` signal with a 'c_roll_call', to tell the
    server that that Wheatley instance is already active and able to ring.  All the 'roll call'
    replies are registered by the server.

3.  `ROLL_CALL_TIME` seconds after 'Look To' is called, the `Wheatley` class looks at the 'roll call'
    replies to decide what to do.  There are 3 cases:


    ### Case 1: There were no replies

    This means either
      a) there aren't any Wheatley instances
    or
      b) all the existing Wheatley instances are broken in some way.
    Either way, the correct response to this is to kill all existing processes and spawn another.


    ### Case 2: There is exactly one instance and exactly one reply

    In this case, the existing Wheatley instance must be alive and ready to ring, so all is fine.

   
    ### Case 3: There are multiple instances and some non-zero number of replies

    In this case, we have too many instances running.  The server keeps the **newest** instance that
    replied, and all others are killed.

    In fact, case (2) is a special case of (3) (albeit the most likely one) so they are implemented
    together.
"""

import json
import time
import os
import subprocess
import psutil
from threading import Thread, Timer

import requests

from app.extensions import log
from app import Config


USER_ID = -1
USER_NAME = "Wheatley"

# The number of seconds that the server waits for Wheatley instances to reply to a roll call
ROLL_CALL_TIME = 1

def _get_stage_name(num_bells):
    return {
        3: "Singles", 4: "Minimus",
        5: "Doubles", 6: "Minor",
        7: "Triples", 8: "Major",
        9: "Caters", 10: "Royal",
        11: "Cinques", 12: "Maximus",
        13: "Sextuples", 14: "Fourteen",
        15: "Sextuples", 16: "Sixteen",
    }[num_bells]


def feature_flag() -> bool:
    """ Determines if the Wheatley feature flag is set. """
    return os.environ.get('RR_ENABLE_WHEATLEY') == '1'


def use_method_extension() -> bool:
    """ Determines if the Wheatley feature flag is set. """
    return os.environ.get('RR_WHEATLEY_METHOD_EXTENSION') == '1'


class Proc:
    """
    The interface to a single Wheatley instance.  There could be multiple Wheatleys in a single
    tower for a short amount of time.
    """

    # The Wheatley process hasn't started yet
    STATE_STARTING = 0
    # The Wheatley process is running
    STATE_RUNNING = 1
    # The Wheatley process has been sent SIGTERM but has not closed yet
    STATE_CONDEMNED = 2
    # The Wheatley process has been killed
    STATE_DEAD = 2
    
    def __init__(self, tower_id, look_to_time, instance_id):
        self._tower_id = tower_id
        self.instance_id = instance_id

        self._state = self.STATE_STARTING

        # The 'wheatley' command will never return, so we have to spawn it in a new thread.
        # This has the pleasant side effect of allowing us to detect Wheatley crashing, because
        # there is always a thread running to catch it
        self._thread = Thread(target=self._process_func, args=[look_to_time])
        self._thread.start()

        # This is set to True when this object is deconstructed, to make sure that the process is
        # not killed twice
        self._has_been_closed = False

    def log(self, message):
        """ Function to make a log entry under this Wheatley instance's name """
        log(f"WHEATLEY:{self._tower_id}:{self.instance_id}:{message}")

    def close(self):
        """ Kill the wheatley instance when this object is deleted. """
        # Don't close this Wheatley instance twice
        if self._has_been_closed:
            return

        self._has_been_closed = True
        self.kill()

    def kill(self):
        # Mark this process as condemned
        self._state = self.STATE_CONDEMNED

        # Only kill the process if it has actually started
        if self._wheatley_process is not None:
            self.log("Killing process")
            self._wheatley_process.kill()

    @property
    def is_dead(self):
        return self._state == self.STATE_DEAD

    # Close the process when this object is GCed
    def __del__(self):
        self.close()

    def _process_func(self, look_to_time):
        """
        All the time that this instance's process is running, there will be a thread stuck in the
        infinite loop within this function.  If the inner process is killed or crashes, then this
        function will return.
        """
        self.log("Starting controller thread")
        wheatley_cmd = "wheatley"
        if "RR_WHEATLEY_PATH" in os.environ:
            wheatley_cmd = os.environ["RR_WHEATLEY_PATH"]

        self._wheatley_process = subprocess.Popen(
            [
                # Spawn wheatley in server-mode ...
                wheatley_cmd,
                "server-mode",
                # ... with the correct tower_id ...
                str(self._tower_id),
                # ... and the current socketio port ...
                "--port",
                str(Config.RR_SOCKETIO_PORT),
                # ... and the right look-to-time ...
                '--look-to-time',
                str(look_to_time),
                # ... and this instances instance_id
                '--id',
                str(self.instance_id)
            ],
            # Capture both stdout and stderr (almost all of the logging goes to stderr)
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        # Log the process starting and move into the 'running' state
        self.log("Spawned process")
        self._state = self.STATE_RUNNING

        for line_bytes in iter(self._wheatley_process.stderr.readline, ""):
            # Detect Wheatley crashing
            if self._wheatley_process.poll() is not None:
                break

            line = line_bytes.decode('utf-8').rstrip("\n")
            self.log(f"{line}")

        # Move into the 'dead' state
        self._state = self.STATE_DEAD


class Wheatley:
    """
    A class to act as an interface between a Tower and the Wheatley instances.  This class will
    act as though a Wheatley instance is always active, and will internally activate and deactivate
    wheatley instances when required.
    """

    def __init__(self, tower, enabled, db_settings):
        self._tower = tower
        # Make sure that Wheatley starts disabled and then becomes enabled.  This way, Wheatley gets
        # explicitly added as a user
        self._enabled = False
        self.set_enabledness(enabled)

        # Parse Wheatley's settings out from the database, initialising them to be blank if the
        # database entry is invalid
        self._settings = db_settings['settings'] if 'settings' in db_settings else {}
        self._row_gen = db_settings['row_gen'] if 'row_gen' in db_settings else {}

        # Populate the settings fields with defaults if they're not already filled
        if 'sensitivity' not in self._settings:
            self._settings['sensitivity'] = 0.5
        if 'use_up_down_in' not in self._settings:
            self._settings['use_up_down_in'] = False
        if 'stop_at_rounds' not in self._settings:
            self._settings['stop_at_rounds'] = False

        # If there is no row_gen defined, default to even-bell Plain Bob on the right number of bells
        if self.row_gen == {}:
            self._set_default_row_gen()

        # Start out with no processes running
        self._instances = []
        self._next_instance_id = 0
        self._roll_call_responses = []
        self._last_look_to_time = float("inf")

    def log(self, message):
        """ Function to make a log entry under this Wheatley instance's name """
        log(f"WHEATLEY:{self._tower.tower_id}:{message}")

    # ===== ENABLEDNESS =====

    @property
    def enabled(self):
        """ Returns True if Wheatley is enabled. """
        return self._enabled

    def set_enabledness(self, value):
        """
        Set the enabledness of Wheatley, making sure that the Tower's user list is kept up-to-date.
        """
        self._enabled = value
        # Add or remove 'Wheatley' to the tower's user list.  This relies on the idempotence of
        # `Tower.add_user` and `Tower.remove_user`
        if self._enabled:
            self._tower.add_user(USER_ID, USER_NAME)
        else:
            self._tower.remove_user(USER_ID)

    # ===== SETTINGS =====

    @property
    def settings(self):
        """ Return Wheatley's settings as JSON. """
        return self._settings

    def update_settings(self, new_settings):
        """ Merge some changed settings into Wheatley's settings. """
        # Copy only the fields from new_settings into the dict
        for key, value in new_settings.items():
            self._settings[key] = value

    # ===== ROW GEN =====

    @property
    def row_gen(self):
        """ Returns the JSON representation of the row generator that Wheatley will use. """
        return self._row_gen

    @row_gen.setter
    def row_gen(self, value):
        """ Sets the JSON representation of the row generator that Wheatley will use. """
        self._row_gen = value

    def _set_default_row_gen(self):
        """ Sets the row generator to some value that is guarunteed to be valid. """
        stage = self._tower.n_bells
        stage_name = _get_stage_name(stage)
        plain_bob_notation = {
            4: 'x14x14,12',
            5: '5.1.5.1.5,125',
            6: 'x16x16x16,12',
            8: 'x18x18x18x18,12',
            10: 'x10x10x10x10x10,12',
            12: 'x1Tx1Tx1Tx1Tx1Tx1T,12',
            14: 'x1Bx1Bx1Bx1Bx1Bx1Bx1B,12',
            16: 'x1Dx1Dx1Dx1Dx1Dx1Dx1Dx1D,12'
        }[stage]

        self._row_gen = {
            'type': 'method',
            'title': 'Plain Bob ' + stage_name,
            'url': 'Plain_Bob_' + stage_name,
            'stage': stage,
            'notation': plain_bob_notation,
            'bob': {'0': '14'},
            'single': {'0': '1234'}
        }

    # ===== CALLBACKS =====

    def on_call(self, call_name):
        """ Called every time a call is made in this Tower. """
        if call_name == "Look to" and USER_ID in self._tower.assignments.values():
            self.log("Recieved `Look To` and needs to ring")
            # Deal with the roll call according to the protocol
            self._last_look_to_time = time.time()
            self._roll_call_responses = []
            Timer(ROLL_CALL_TIME, self._take_roll_call).start()

    def on_roll_call(self, instance_id):
        self.log(f"Recieved roll call reply from {instance_id}")
        self._roll_call_responses.append(instance_id)

    def _take_roll_call(self):
        self.log(f"Taking roll call.  Responses: {self._roll_call_responses}")

        # Before anything else, remove all the dead instances from the list
        def check_alive(i):
            if i.is_dead:
                self.log(f"Removing dead instance {i.instance_id}")
            return not i.is_dead

        self._instances = list(filter(check_alive, self._instances))
        
        if self._roll_call_responses == []:
            # Case 1: No responses were made, so all processes are assumed dead
            self.log("No responses, so killing all processes and spawning new ones")
            # Kill all instances, and create a new one
            self.reset()
            self._spawn_new_instance()
        else:
            # Case 2 & 3: Some number of responses were made.  If this is bigger than 1, then
            # all processe but the newest reply should be killed.
            self.log(f"{len(self._roll_call_responses)} responses and {len(self._instances)}"
                    + f" instances.")
            assert len(self._roll_call_responses) <= len(self._instances)
            # Kill all instances except the newest one which replied to the roll-call
            newest_active_instance = max(self._roll_call_responses)
            self.log(f"Newest active instance is {newest_active_instance}")
            for i in self._instances:
                if i.instance_id != newest_active_instance:
                    self.log(f"Killing {i.instance_id}")
                    i.kill()

    def _spawn_new_instance(self):
        self.log(f"Spawning new process with id {self._next_instance_id}")
        self._instances.append(
            Proc(self._tower.tower_id, self._last_look_to_time, self._next_instance_id)
        )
        self._next_instance_id += 1

    def _kill_all(self):
        self.log("Killing all processes")

        for proc in psutil.process_iter():
            process_name = proc.name()
            if self._tower.tower_id in process_name and "wheatley" in process_name:
                proc.kill()
        

    def reset(self):
        """ Kill all existing Wheatley processes, as a hard reset. """
        self.log("Hard reset")
        self._kill_all()

    def on_size_change(self):
        """ Called whenever the number of bells in the tower is changed. """
        new_size = self._tower.n_bells
        # Shift the stage of Wheatley's row generation (defaulting to Plain Bob if the method cannot
        # be shifted)
        if self._row_gen['type'] == 'method' and use_method_extension():
            # If it's a method, we should first check that the method can extend to the new stage.
            # If it can, we update to that method - falling back to even-bell Plain Bob if anything
            # goes wrong.
            # Find the next stage of the method, and its name
            is_even_bell_method = self._row_gen['stage'] % 2 == 0
            new_stage_name = _get_stage_name(new_size if is_even_bell_method else new_size - 1)
            # Replace the last item in the method's url (which has to be the stage) with the new stage
            old_url = self._row_gen['url']
            url_parts = old_url.split("_")
            url_parts[-1] = new_stage_name
            new_url = "_".join(url_parts)
            # Check if this exists on Bob Wallis' blueline website
            requested_page = requests.get(f"https://rsw.me.uk/blueline/methods/view/{new_url}.json")
            if requested_page.status_code == 200:
                # Bob Wallis' API always serves a list, even if there's only one method, so we take the
                # 0th element of that list as our method JSON
                method_json = json.loads(requested_page.text)[0]
                # There is a possiblity that the user changes the tower multiple times quickly, and that
                # the requests will come back in the opposite order and could therefore cause an invalid
                # method to be displayed.  So, we should return early if setting the row gen would
                # create an invalid stage
                if method_json['stage'] not in [new_size - 1, new_size]:
                    return

                # A helper function to convert Bob Wallis' representation of calls into Wheatley's
                def convert_call(name):
                    # Return early if the JSON doesn't have a field 'calls'
                    if 'calls' not in method_json:
                        return {}
                    # Extract the call from its name, and early return if it isn't defined
                    call = method_json['calls'].get(name)
                    if call is None:
                        return {}
                    # Convert the call into a dict from indices to notation
                    converted_call = {}
                    for i in range(method_json['lengthOfLead'] // call['every']):
                        converted_call[str(call['from'] + i * call['every'])] = call['notation']
                    return converted_call

                self._row_gen = {
                    'type': 'method',
                    'title': method_json['title'],
                    'url': new_url,
                    'stage': method_json['stage'],
                    'notation': method_json['notation'],
                    'bob': convert_call('Bob'),
                    'single': convert_call('Single')
                }
                return

        # If no extension has been made, we fall back to Plain Bob on all the bells
        self._set_default_row_gen()
