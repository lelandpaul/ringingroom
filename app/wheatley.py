"""
A module to contain all the code relating to the interactions of Ringing Room with Wheatley.
All the technical details are contained in this file and the Wheatley class, and the rest of the
code should only interact with the provided functions.
"""

import json
import time
import os
import subprocess
from threading import Thread

import requests

from app.extensions import log
from app import Config


USER_ID = -1
USER_NAME = "Wheatley"


def _get_stage_name(num_bells):
    return {
        3: "Singles", 4: "Minimus",
        5: "Doubles", 6: "Minor",
        7: "Triples", 8: "Major",
        9: "Caters", 10: "Royal",
        11: "Cinques", 12: "Maximus",
        13: "Thirteen", 14: "Fourteen",
        15: "Fifteen", 16: "Sixteen",
    }[num_bells]


def feature_flag() -> bool:
    """ Determines if the Wheatley feature flag is set. """
    return os.environ.get('RR_ENABLE_WHEATLEY') == '1'


# Class to store the interface with an instance of Wheatley
class Wheatley:
    """
    A class to act as an interface between a Tower and the Wheatley instances.  This class will
    act as though a Wheatley instance is always active, and will internally activate and deactivate
    wheatley instances when required.
    """

    def __init__(self, tower, enabled, db_settings):
        self._tower = tower
        # Make sure that the correct side effects happen when setting Wheatley's enabledness
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

        # If there is no row_gen defined, set it to even-bell Plain Bob on the right number of bells
        if self.row_gen == {}:
            self._set_default_row_gen()

        self._is_active = False
        self._wheatley_process = None
        self._thread = None
        self._should_thread_stop = False

        self._has_been_closed = False

    def log(self, message):
        """ Function to make a log entry under this Wheatley instance's name """
        log(f"WHEATLEY:{self._tower.tower_id}:{message}")

    @property
    def enabled(self):
        """ Returns True if Wheatley is enabled """
        return self._enabled

    def set_enabledness(self, value):
        """
        Set the enabledness of Wheatley, making sure that the Tower's user list is kept up-to-date.
        """
        self._enabled = value
        # Add or remove 'Wheatley' to the tower's user list
        if self._enabled:
            self._tower.add_user(USER_ID, USER_NAME)
        else:
            self._tower.remove_user(USER_ID)

    # ===== SETTINGS =====

    @property
    def settings(self):
        """ Return Wheatley's settings. """
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
            6: 'x16x16x16,12',
            8: 'x18x18x18x18,12',
            10: 'x10x10x10x10x10,12',
            12: 'x1Tx1Tx1Tx1Tx1Tx1T,12'
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

    def on_assigned_bell(self):
        """ Called whenever Wheatley is assigned to a bell. """
        self._make_active()

    def on_call(self, call_name):
        if call_name == "Look to" and USER_ID in self._tower.assignments.values():
            self._make_active(True)

    def on_size_change(self):
        """ Called whenever the number of bells in the tower is changed. """
        new_size = self._tower.n_bells
        # Shift the stage of Wheatley's row generation (defaulting to Plain Bob if the method cannot
        # be shifted)
        if self._row_gen['type'] == 'method':
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
            else:
                # If anything went wrong with the request, fall back to Plain Bob, which can be
                # generated offline
                self._set_default_row_gen()
        elif self._row_gen['type'] == 'composition':
            # If it's a composition, then it cannot be stepped to a new stage.  So we always fallback to
            # even-bell Plain Bob
            self._set_default_row_gen()

    # ===== PROCESS HANDLING =====

    # Make sure the Wheatley process is active
    def _make_active(self, has_called_look_to=False):
        """ Makes sure that a Wheatley instance is active. """
        if not self._is_active:
            # Spawn a new Wheatley instance and add 'Wheatley' to the user index
            self._spawn_process(has_called_look_to)

    def _spawn_process(self, has_called_look_to):
        """ Spawns a new thread that will run a Wheatley instance. """
        # The 'wheatley' command will never return, so we have to spawn it in a new thread.
        # This has the pleasant side effect of allowing us to detect Wheatley crashing because
        self._thread = Thread(target=self._process_func, args=[has_called_look_to])
        self._thread.start()

    def _process_func(self, has_called_look_to):
        """
        This function handles the Wheatley process, and handles things like logging and detecting
        crashes.
        """
        self.log("Spawning process")
        wheatley_cmd = "wheatley"
        if "RR_WHEATLEY_PATH" in os.environ:
            wheatley_cmd = os.environ["RR_WHEATLEY_PATH"]

        self._wheatley_process = subprocess.Popen(
            [
                wheatley_cmd,
                "server-mode",
                "--port",
                Config.RR_SOCKETIO_PORT,
                str(self._tower.tower_id)
            ] + (['--look-to-time', str(time.time())] if has_called_look_to else []),
            # Capture both stdout and stderr (almost all of the logging goes to stderr)
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        self.log("Spawned process")
        self._is_active = True

        for line_bytes in iter(self._wheatley_process.stderr.readline, ""):
            if self._should_thread_stop:
                break

            # Detect Wheatley crashing
            if self._wheatley_process.poll() is not None:
                break

            line = line_bytes.decode('utf-8').rstrip("\n")
            self.log(f"{line}")

        # Clear-up
        self._thread = None
        self._should_thread_stop = False
        self._wheatley_process = None
        self._is_active = False

    def close(self):
        """ Kill the wheatley instance when this object is deleted. """
        # Don't close this Wheatley instance twice
        if self._has_been_closed:
            return

        self._has_been_closed = True
        self.kill_process()

    def kill_process(self):
        # Tell the thread to terminate
        self._should_thread_stop = True

        # Only kill the process if it has actually started
        if self._wheatley_process is not None:
            self.log("Killing process")
            self._wheatley_process.kill()

    def __del__(self):
        self.close()
