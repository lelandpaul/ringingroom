///////////
/* SETUP */
///////////

// Constants
const LEFT_HAND = "left";
const RIGHT_HAND = "right";

// Static config
const WHEATLEY_MAX_METHOD_SUGGESTIONS = 8;

// Don't log unless needed
var logger = (function () {
    var oldConsoleLog = null;
    var pub = {};

    pub.enableLogger = function enableLogger() {
        if (oldConsoleLog == null) {
            return;
        }

        window["console"]["log"] = oldConsoleLog;
    };

    pub.disableLogger = function disableLogger() {
        oldConsoleLog = console.log;
        window["console"]["log"] = function () {};
    };

    return pub;
})();
// logger.disableLogger()

// Set up socketio instance
var socketio = io(window.tower_parameters.server_ip);

// Various Vue instances need this on creation
var cur_tower_id = parseInt(window.tower_parameters.id);

// If they're not anonymous, get their username
var cur_user_name = window.tower_parameters.cur_user_name;
const cur_user_id = parseInt(window.tower_parameters.cur_user_id);

// Set up a handler for leaving, then register it *everywhere*
var has_left_room = false;
var leave_room = function () {
    if (has_left_room) {
        return;
    }
    has_left_room = true;
    socketio.emit("c_user_left", {
        user_token: window.tower_parameters.user_token,
        anonymous_user: window.tower_parameters.anonymous_user,
        tower_id: cur_tower_id,
    });
};

// set up disconnection at beforeunload
window.addEventListener("beforeunload", leave_room, "useCapture");
window.onbeforeunload = leave_room;

// initial data state
window.user_parameters = {
    bell_volume: 4,
    handbell_mod: 0.2,
};

////////////////////////
/* SOCKETIO LISTENERS */
////////////////////////

// A bell was rung
socketio.on("s_bell_rung", function (msg) {
    // console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
    // if(msg.disagree) {}
    bell_circle.ring_bell(msg.who_rang);
});

// A bell was silently swapped between strokes
socketio.on("s_silent_swap", function (msg) {
    // console.log('silent swap', msg);
    bell_circle.$refs.bells[parseInt(msg.who_swapped) - 1].set_state_silently(msg.new_bell_state);
});

// Userlist was set
socketio.on("s_set_userlist", function (msg) {
    // console.log('s_set_userlist: ',  msg.user_list);
    bell_circle.$refs.users.user_names = msg.user_list;
    msg.user_list.forEach((user, index) => {
        bell_circle.$refs.users.add_user({
            user_id: parseInt(user.user_id),
            username: user.username,
            badge: user.badge,
        });
    });
});

// User entered the room
socketio.on("s_user_entered", function (msg) {
    // console.log(msg.username + ' entered')
    bell_circle.$refs.users.add_user(msg);
});

// User left the room
socketio.on("s_user_left", function (msg) {
    // console.log(msg.username + ' left')
    // It's possible that we'll receive this when we've just been kicked. If so, redirect
    console.log(msg);
    if (msg.kicked && msg.user_id === parseInt(window.tower_parameters.cur_user_id)) {
        window.location.href = "/";
    }
    bell_circle.$refs.users.remove_user(msg);
    bell_circle.$refs.bells.forEach((bell, index) => {
        if (bell.assigned_user === msg.user_id) {
            bell.assigned_user = null;
        }
    });
});

// Number of observers changed
socketio.on("s_set_observers", function (msg) {
    // console.log('observers: ' + msg.observers);
    bell_circle.$refs.users.observers = msg.observers;
});

// User was assigned to a bell
socketio.on("s_assign_user", function (msg) {
    // console.log('Received user assignment: ' + msg.bell + ' ' + msg.user);
    try {
        // This stochastically very error-prone:
        // Sometimes it sets the state before the bell is created
        // As such: try it, but if it doesn't work wait a bit and try again.
        bell_circle.$refs.bells[msg.bell - 1].assigned_user = msg.user;
        if (msg.user === cur_user_id) {
            bell_circle.$refs.users.rotate_to_assignment();
        }
    } catch (err) {
        // console.log('caught error assign_user; trying again');
        setTimeout(100, function () {
            bell_circle.$refs.bells[msg.bell - 1].assigned_user = msg.user;
            if (msg.user === cur_user_id) {
                bell_circle.$refs.users.rotate_to_assignment();
            }
        });
    }
});

// A call was made
socketio.on("s_call", function (msg) {
    // console.log('Received call: ' + msg.call);
    bell_circle.$refs.display.make_call(msg.call);
});

// The server told us the number of bells in the tower
socketio.on("s_size_change", function (msg) {
    var new_size = msg.size;
    bell_circle.number_of_bells = new_size;
    // The user may already be assigned to something, so rotate
    bell_circle.$refs.users.rotate_to_assignment();
    if (!window.tower_parameters.listen_link && !window.tower_parameters.anonymous_user) {
        bell_circle.$refs.wheatley.update_number_of_bells();
    }
});

// The server sent us the global state; set all bells accordingly
socketio.on("s_global_state", function (msg) {
    var gstate = msg.global_bell_state;
    for (var i = 0; i < gstate.length; i++) {
        try {
            // This stochastically very error-prone:
            // Sometimes it sets the state before the bell is created
            // As such: try it, but if it doesn't work wait a bit and try again.
            bell_circle.$refs.bells[i].set_state_silently(gstate[i]);
        } catch (err) {
            // console.log('caught error set_state; trying again');
            setTimeout(100, function () {
                bell_circle.$refs.bells[i].set_state_silently(gstate[i]);
            });
        }
    }
});

// The server told us whether to use handbells or towerbells
socketio.on("s_audio_change", function (msg) {
    // console.log('changing audio to: ' + msg.new_audio);
    bell_circle.$refs.controls.audio_type = msg.new_audio;
    bell_circle.audio = audio_types[msg.new_audio];
    // Make sure the volume is set consistently
    //md = msg.new_audio == 'Tower' ? 1 : window.user_parameters.handbell_mod;
    let md = msg.new_audio == "Hand" ? window.user_parameters.handbell_mod : 1.0;
    bell_circle.audio._volume = md * window.user_parameters.bell_volume * 0.1;
});

// A chat message was received
socketio.on("s_msg_sent", function (msg) {
    bell_circle.$refs.chatbox.messages.push(msg);
    if (msg.email != window.tower_parameters.cur_user_email && !$("#chat_input_box").is(":focus")) {
        bell_circle.unread_messages++;
    }
    bell_circle.$nextTick(function () {
        $("#chat_messages").scrollTop($("#chat_messages")[0].scrollHeight);
    });
});

if (!window.tower_parameters.listen_link) {
    // Wheatley has been enabled or disabled
    socketio.on("s_set_wheatley_enabledness", function (data) {
        // console.log("Setting Wheatley's enabledness to " + data.enabled);
        if (!window.tower_parameters.listen_link && !window.tower_parameters.anonymous_user) {
            bell_circle.$refs.wheatley.enabled = data.enabled;
        }
    });

    // A Wheatley setting has been changed
    socketio.on("s_wheatley_setting", function (msg) {
        // console.log("Received Wheatley setting(s):", msg);
        bell_circle.$refs.wheatley.update_settings(msg);
    });

    // Wheatley's row gen has been changed
    socketio.on("s_wheatley_row_gen", function (msg) {
        // console.log("Received Wheatley row gen:", msg);
        bell_circle.$refs.wheatley.update_row_gen(msg);
    });

    // Wheatley has updated whether or not he thinks a touch is in progress
    socketio.on("s_wheatley_is_ringing", function (msg) {
        // console.log("Received Wheatley is-ringing:", msg);
        bell_circle.$refs.wheatley.update_is_ringing(msg);
    });
}

// Host mode was changed
socketio.on("s_host_mode", function (msg) {
    bell_circle.$refs.controls.host_mode = msg.new_mode;
});

// The server redirected us
// This can happen if the user arrived here with an invalid Bearer token
// In which case they get redirected to log in
socketio.on("s_redirection", function (destination) {
    window.location.href = destination;
});

/////////
/* VUE */
/////////

// all vue objects needs to be defined within  document.read, so that the jinja
// templates are rendered first

// However, we need the main Vue to be accessible in the main scope
var bell_circle;

$(document).ready(function () {
    Vue.options.delimiters = ["[[", "]]"]; // make sure vue doesn't interfere with jinja

    /* BELLS */

    // First, set up the bell component
    // number — what bell
    // poss — where in the tower (the css class)
    // stroke — boolean — is the bell currently at hand?
    // ring() — toggle the stroke, then
    Vue.component("bell_rope", {
        props: ["number", "position", "number_of_bells", "audio"],

        // data in props should be a function, to maintain scope
        data: function () {
            return {
                stroke: true,
                circled_digits: [
                    "①",
                    "②",
                    "③",
                    "④",
                    "⑤",
                    "⑥",
                    "⑦",
                    "⑧",
                    "⑨",
                    "⑩",
                    "⑪",
                    "⑫",
                    "⑬",
                    "⑭",
                    "⑮",
                    "⑯",
                ],
                images: ["handstroke", "backstroke"],
                assigned_user: window.tower_parameters.assignments[this.number - 1],
            };
        },

        computed: {
            image_prefix: function () {
                return audio_types.image_prefix[this.$root.$refs.controls.audio_type];
            },

            assignment_mode: function () {
                return this.$root.$refs.users.assignment_mode;
            },

            cur_user: function () {
                return this.$root.$refs.users.cur_user;
            },

            assigned_user_name: function () {
                return this.$root.$refs.users.get_user_name(this.assigned_user);
            },

            left_side: function () {
                if (this.position == 1) {
                    return false;
                }
                if (window.tower_parameters.anticlockwise) {
                    if (this.position >= this.number_of_bells / 2 + 1) {
                        return true;
                    }
                    return false;
                }
                if (this.position <= this.number_of_bells / 2 + 1) {
                    return true;
                }
                return false;
            },

            top_side_anticlockwise: function () {
                if (this.number_of_bells === 4 && 2 <= this.position <= 3) {
                    return true;
                }
                if (this.number_of_bells === 5 && 2 <= this.position && this.position <= 5) {
                    return true;
                }
                if (this.number_of_bells === 6 && (this.position === 3 || this.position === 4)) {
                    return true;
                }
                if (this.number_of_bells === 8 && 3 <= this.position && this.position <= 6) {
                    return true;
                }
                if (this.number_of_bells === 10 && this.position >= 4 && this.position <= 7) {
                    return true;
                }
                if (this.number_of_bells === 12 && this.position >= 4 && this.position <= 9) {
                    return true;
                }
                if (this.number_of_bells === 14 && this.position >= 5 && this.position <= 10) {
                    return true;
                }
                if (this.number_of_bells === 16 && this.position >= 5 && this.position <= 12) {
                    return true;
                }
            },

            top_side: function () {
                if (window.tower_parameters.anticlockwise) {
                    return this.top_side_anticlockwise;
                }
                if (this.number_of_bells === 4 && this.position >= 3) {
                    return true;
                }
                if (this.number_of_bells === 5 && this.position >= 3) {
                    return true;
                }
                if (this.number_of_bells === 6 && (this.position === 4 || this.position === 5)) {
                    return true;
                }
                if (this.number_of_bells === 8 && this.position >= 4 && this.position !== 8) {
                    return true;
                }
                if (this.number_of_bells === 10 && this.position >= 5 && this.position < 9) {
                    return true;
                }
                if (this.number_of_bells === 12 && this.position >= 5 && this.position <= 10) {
                    return true;
                }
                if (this.number_of_bells === 14 && this.position >= 7 && this.position <= 13) {
                    return true;
                }
                if (this.number_of_bells === 16 && this.position >= 7 && this.position <= 14) {
                    return true;
                }
            },
        },

        methods: {
            // emit a ringing event ot the server
            emit_ringing_event: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't ring if not logged in
                if (this.assignment_mode) {
                    return;
                } // disable while assigning
                if (this.$root.$refs.controls.host_mode && this.assigned_user !== cur_user_id) {
                    // user is not allowed to ring this bell
                    bell_circle.$refs.display.display_message(
                        "You may only ring your assigned bells."
                    );
                    return;
                }
                socketio.emit("c_bell_rung", {
                    bell: this.number,
                    stroke: this.stroke,
                    tower_id: cur_tower_id,
                });
                /*
                console.log(
                    `Bell ${this.number} will ring at ${this.stroke ? "handstroke" : "backstroke"}`
                );
                */
            },

            // Ringing event received; now ring the bell
            ring: function () {
                this.stroke = !this.stroke;
                let audio_type;
                let audio_obj;

                if (this.$root.$refs.controls.audio_type == "Tower") {
                    if (
                        window.tower_parameters.fully_muffled &&
                        window.tower_parameters.half_muffled
                    ) {
                        // Tolling — muffled except tenor backstrokes
                        if (this.number == this.number_of_bells && this.stroke) {
                            audio_type = this.$root.$refs.controls.audio_type;
                            audio_obj = this.audio;
                        } else {
                            audio_type = "Muffled";
                            audio_obj = muffled;
                        }
                    } else if (
                        (window.tower_parameters.half_muffled && this.stroke) ||
                        window.tower_parameters.fully_muffled
                    ) {
                        audio_type = "Muffled";
                        audio_obj = muffled;
                    } else {
                        audio_type = this.$root.$refs.controls.audio_type;
                        audio_obj = this.audio;
                    }
                } else {
                    audio_type = this.$root.$refs.controls.audio_type;
                    audio_obj = this.audio;
                }
                audio_obj.play(bell_mappings[audio_type][this.number_of_bells][this.number - 1]);
                /*
                console.log(
                    `Bell ${this.number} rang a ${this.stroke ? "handstroke" : "backstroke"}`
                );
                */
            },

            // global_state received; set the bell to the correct stroke
            set_state_silently: function (new_state) {
                // console.log('Bell ' + this.number + ' set to ' + new_state)
                this.stroke = new_state;
            },

            // Assign a specific user to this bell, without performing any checks (useful for
            // filling Wheatley onto bells)
            assign_specific_user: function (user) {
                socketio.emit("c_assign_user", {
                    bell: this.number,
                    user: user,
                    tower_id: cur_tower_id,
                });
            },

            assign_user_by_id: function (id) {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't assign if not logged in
                if (this.assigned_user) {
                    return;
                } // don't kick people off
                this.assign_specific_user(id);
            },

            assign_user: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't assign if not logged in

                if (this.assigned_user) {
                    return;
                } // don't kick people off

                if (!this.assignment_mode) {
                    return;
                }

                // override_user is used to assign Wheatley instead of the currently selected user
                this.assign_specific_user(this.$root.$refs.users.selected_user);
            },

            unassign: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't ring if not logged in

                socketio.emit("c_assign_user", {
                    bell: this.number,
                    user: "",
                    tower_id: cur_tower_id,
                });
            },
        },

        template: `
<div class="bell unclickable_div"
        :class="[left_side ? 'left' : 'right',
                top_side ? 'top' : 'bottom',
                stroke ? 'handstroke' : 'backstroke',
                image_prefix === 'h-' ? 'handbell' : '',
                image_prefix === 't-' ? 'towerbell' : '',
                image_prefix === 'c-' ? 'cowbell' : '',
                window.tower_parameters.anonymous_user ? 'no_ring' : '']">
    <div class="btn-group user_cartouche clickable">
        <template v-if="!left_side">
            <button class="btn btn-sm btn_number"
                    :class="[number == 1 ? 'treble' : 'active',
                             number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                             assigned_user == cur_user ? 'cur_user' : '']"
                    style="cursor: inherit;">
                <span class="number"> [[number]] </span>
            </button>
        </template>
        <template v-else>
            <button class="btn btn-sm btn_unassign"
                    :class="[number == 1 ? 'treble' : '',
                             number == 1 ? 'btn-primary' : 'btn-outline-secondary']"
                    v-if="assignment_mode && assigned_user &&
                    !(assigned_user!==cur_user && $root.$refs.controls.lock_controls)"
                    @click="unassign">
                <span class="unassign">
                    <i class="fas fa-window-close"></i>
                </span>
            </button>
        </template>
        <button class="btn btn-sm btn_assigned_user"
                :class="[number == 1 ? 'treble' : '',
                         number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                         assigned_user ? 'disabled' : '',
                         assigned_user==cur_user ? 'cur_user' :'',
                         assignment_mode ? '' : 'disabled']"
                @click="assign_user"
                v-if="assignment_mode || assigned_user">
            <span class="assigned_user">
                [[ (assignment_mode) ?
                    ((assigned_user) ? assigned_user_name : '(none)')
                    : assigned_user_name ]]
            </span>
        </button>
        <template v-if="left_side">
            <button class="btn btn-sm btn_number"
                    :class="[number == 1 ? 'treble' : 'active',
                             number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                             assigned_user == cur_user ? 'cur_user' : '']"
                    style="cursor: inherit;">
                <span class="number"> [[number]] </span>
            </button>
        </template>
        <template v-else>
            <button class="btn btn-sm btn_unassign"
                    :class="[number == 1 ? 'treble' : '',
                             number == 1 ? 'btn-primary' : 'btn-outline-secondary']"
                    v-if="assignment_mode && assigned_user &&
                    !(assigned_user!==cur_user && $root.$refs.controls.lock_controls)"
                    @click="unassign">
                <span class="unassign">
                    <i class="fas fa-window-close"></i>
                </span>
            </button>
        </template>
    </div>
    <img @click='emit_ringing_event'
         class="bell_img clickable"
         :class="[assignment_mode ? 'assignment_mode' : '']"
         :src="'static/images/' +
               image_prefix +
               ((stroke || image_prefix === 'c-') ? images[0] : images[1]) +
               (number == 1 && (stroke || image_prefix === 'c-') ? '-treble' : '') +
               '.png'"
         />
</div>
`,
    }); // End bell_rope component

    // The call_display is where call messages are flashed
    Vue.component("call_display", {
        props: ["audio"],

        // data in components should be a function, to maintain scope
        data: function () {
            return {
                cur_call: "",
                next_call_clear_time: -Infinity,
            };
        },

        computed: {
            assignment_mode: function () {
                return this.$root.$refs.users.assignment_mode;
            },
        },

        methods: {
            // Used to display temporary messages to users (typically when they do something they're
            // not permitted to do in host-mode).
            display_message: function (message, timeout) {
                // Default timeout to 3s
                timeout = timeout || 3000;
                // Set the call, and make sure that the display is not cleared until this call has
                // had time to display (i.e. this will stop any old callbacks from taking effect).
                this.cur_call = message;
                this.next_call_clear_time = Date.now() + timeout;
                var self = this;
                // Remove the message after `timeout` milliseconds
                setTimeout(function () {
                    // Make sure that if another call has been called, then we don't clear the
                    // screen from a callback from an old call.  Basically we want to avoid the
                    // following timeline (time goes down):
                    //
                    // *        Calls Bob
                    //
                    //
                    //     *    Calls Single
                    // *        Callback from Bob clears call just after the Single appears
                    //
                    //
                    //     *    Callback from Single does nothing
                    if (Date.now() >= self.next_call_clear_time - 3) {
                        self.cur_call = "";
                    }
                }, timeout);
            },

            // a call was received from the server; display it and play audio
            make_call: function (call) {
                this.display_message(call, 2000);
                if (call.indexOf("sorry") != -1 || call.indexOf("Sorry") != -1) {
                    calls.play("SORRY");
                } else if (call in call_types) {
                    calls.play(call_types[call]);
                } else if (call.indexOf("Go") == 0) {
                    return;
                } else {
                    calls.play(call_types["Change method"]);
                }
            },
        },

        template: `
<h2 id='call_display' ref='display'>
    [[ assignment_mode ? 'To resume ringing, press "Stop Assigning" on the control panel.' : cur_call ]]
</h2>
`,
    }); // end call_display component

    // The focus_display indicated when the window has lost focus
    Vue.component("focus_display", {
        // data in components should be a function, to maintain scope
        data: function () {
            return {
                visible: true,
            };
        },

        computed: {
            controller_active: function () {
                const controllers = this.$root.$refs.controllers;
                return controllers.has_controller;
            },
        },

        mounted: function () {
            this.$nextTick(function () {
                window.addEventListener("focus", this.hide);
                window.addEventListener("blur", this.show);

                document.hasFocus() ? this.hide() : this.show();
            });
        },

        methods: {
            show() {
                this.visible = true;
            },
            hide() {
                this.visible = false;
            },
        },

        template: `
<h2 v-show="visible"
    v-if="!window.tower_parameters.listen_link
          && !window.tower_parameters.anonymous_user
          && !controller_active"
          id='focus_display'>
    Click anywhere in Ringing Room to resume ringing.
</h2>
`,
    }); // end focus_display component

    // tower_controls holds title, id, size buttons, audio toggle
    Vue.component("tower_controls", {
        // data in components should be a function, to maintain scope
        data: function () {
            return {
                tower_sizes: window.tower_parameters.sizes_available,
                audio_type: window.tower_parameters.audio,
                host_mode: window.tower_parameters.host_mode,
            };
        },

        computed: {
            number_of_bells: function () {
                return this.$root.number_of_bells;
            },

            lock_controls: function () {
                return this.host_mode && !window.tower_parameters.host_permissions;
            },
        },

        watch: {
            audio_type: function () {
                // console.log('swapped audio type');
                socketio.emit("c_audio_change", {
                    new_audio: this.audio_type,
                    tower_id: cur_tower_id,
                });
            },

            host_mode: function () {
                // console.log('swapped host mode to: ' + this.host_mode);
                socketio.emit("c_host_mode", {
                    new_mode: this.host_mode,
                    tower_id: cur_tower_id,
                });
            },
        },

        methods: {
            // the user clicked a tower-size button
            set_tower_size: function (size) {
                if (window.tower_parameters.anonymous_user) {
                    return; // don't do anything if not logged in
                }
                // Update the peal speed according to this tower size change.  Only the user who
                // changed the tower size creates a new `c_wheatley_setting` signal for the peal
                // speed - this way, the server isn't inundated with identical settings changes.
                const old_size = this.number_of_bells;
                bell_circle.$refs.wheatley.on_tower_size_change(old_size, size);

                // console.log('setting tower size to ' + size);
                socketio.emit("c_size_change", {
                    new_size: size,
                    tower_id: cur_tower_id,
                });
            },

            set_bells_at_hand: function () {
                bell_circle.set_bells_at_hand();
            },
        },

        template: `
<div class="tower_controls_inner"
     v-if="!window.tower_parameters.anonymous_user">
    <div class="row justify-content-between"
         v-if="window.tower_parameters.host_permissions
            && window.tower_parameters.host_mode_permitted">
        <div class="col">
            <h4 class="mb-0 pt-1">Host Mode:</h4>
        </div>
        <div class="col">
            <div class="btn-group btn-block btn-group-toggle align-bottom">
                <label class="btn btn-outline-primary autoblur"
                       :class="{active: !host_mode}">
                    <input type="radio"
                           class="autoblur"
                           name="host_mode"
                           id="host_false"
                           :value="false"
                           v-model="host_mode"
                           />
                    Off
                </label>
                <label class="btn btn-outline-primary autoblur"
                       :class="{active: host_mode}">
                    <input type="radio"
                           class="autoblur"
                           name="host_mode"
                           id="host_true"
                           :value="true"
                           v-model="host_mode"
                           />
                    On
                </label>
            </div>
        </div>
    </div>
    <div v-if="lock_controls" class="row">
        <div class="col">
            <small class="text-muted">
                Host mode is enabled. Only hosts can change tower settings or assign bells.
            </small>
        </div>
    </div>
    <div class="row between-xs">
        <div class="col">
            <div class="btn-group btn-block btn-group-toggle">
                <label v-for="size in tower_sizes"
                       :size="size"
                       class="btn btn-outline-primary autoblur"
                       :class="{active: size === number_of_bells,
                       disabled: lock_controls}"
                       @click="set_tower_size(size)"
                       >
                    <input type="radio"
                           class="autoblur"
                           name="size"
                           :value="size"
                           />
                    [[ size ]]
                </label>
            </div>
        </div>
    </div>
    <div class="row justify-content-between">
        <div class="col">
            <div class="btn-group btn-block btn-group-toggle">
                <label class="btn btn-outline-primary autoblur"
                       :class="{active: audio_type == 'Tower',
                                disabled: lock_controls}">
                    <input type="radio"
                           class="autoblur"
                           name="audio"
                           id="audio_tower"
                           value="Tower"
                           v-model="audio_type"
                           />
                    Tower
                </label>
                <label class="btn btn-outline-primary autoblur"
                       :class="{active: audio_type == 'Hand',
                       disabled: lock_controls}"
                       >
                    <input type="radio"
                           class="autoblur"
                           name="audio"
                           id="audio_hand"
                           value="Hand"
                           v-model="audio_type"
                           />
                    Hand
                </label>
                <label class="btn btn-outline-primary autoblur"
                       :class="{active: audio_type == 'Cow',
                                disabled: lock_controls}"
                       v-if="window.tower_parameters.cow_enabled"
                        >
                    <input type="radio"
                           class="autoblur"
                           name="audio"
                           id="audio_cow"
                           value="Cow"
                           v-model="audio_type"
                           />
                    Cow
                </label>
            </div>
        </div>
        <div class="col">
            <button class="set_at_hand btn btn-outline-primary btn-block px-1 autoblur"
                    :class="{disabled: lock_controls}"
                    @click="set_bells_at_hand"
                    >
                Set at hand
            </button>
        </div>
    </div>
</div>
<!-- tower controls -->
`,
    }); // End tower_controls

    // help holds help toggle
    Vue.component("help", {
        // data in components should be a function, to maintain scope
        data: function () {
            return {
                help_showing: false,
            };
        },

        methods: {
            // the user clicked the audio toggle
            show_help: function () {
                // console.log('showing or hiding help');
                this.help_showing = !this.help_showing;
            },
        },

        template: `
<div class="row" v-if="!window.tower_parameters.observer">
    <div class="col">
        <div class="card text-justify">
            <div class="card-body">
                <h5 class="card-title">How to use Ringing Room</h5>
                <p>To ring, you may either click on the ropes or use the following hot-keys:</p>
                <ul>
                    <li>
                        <b>[SPACE]:</b> Rings the bell in the lower right corner.
                    </li>
                    <li>
                        <b>[LEFT] and [RIGHT] arrow keys:</b> Rings the left and right bottom-most bells; or if you are assigned to a bell or two, rings those bells instead, even if the tower is rotated.
                    </li>
                    <li>
                        <b>[f] and [j]:</b> same as [LEFT] and [RIGHT]
                    </li>
                    <li>
                        <b>[SHIFT]+[1-9], [0], [-], [=], [q], [w], [e], [r]:</b> Rotate the "perspective" of the ringing room to put that bell in the lower right corner so it may be rung by [SPACE] or [j].
                    </li>
                    <li>
                        <b>[1-9], [0], [-], [=], [q], [w], [e], [r]:</b> Rings bells 1 - 9, 10, 11, 12, 13, 14, 15, and 16
                    </li>
                    <li>
                        <b>[SHIFT]+[s]:</b> Set all bells at hand.</b>
                    </li>
                </ul>
                <p> The tower controls allow you to set the number of bells, change whether you're using towerbell or handbell images and sounds, and set all the bells at hand.</p>
                <p>The user list allows you to
                    <i>assign ringers</i> to particular bells. To assign ringers, press the "Assign Bells" button to enter bell assignment mode. While in this mode, you may select any ringer from the user list by clicking on them, and then click on the box next to the bell you want to assign them to. Clicking the "x" by a user's name will unassign them from that bell. While in assignment mode, you can't ring any bells; when you're done assigning bells, click the "Stop Assigning" button to return to normal mode.
                </p>
                <p>Assigning a user to a bell will have the effect of automatically rotating that ringer's "perspective" on the tower so that the bell is placed in the bottom right position. This will allow it to be rung using the [SPACE] or [j] hotkeys. If a user is assigned to multiple bells, the lowest-numbered one will be placed in position; this means that if the user is assigned to exactly 2 bells, those bells will be ringable with [f] and [j].</p>
                <p>You can make calls by using the hotkeys below.</p>
                <ul>
                    <li>
                        <b>[l]</b>ook to...
                    </li>
                    <li>
                        <b>[g]</b>o next time
                    </li>
                    <li>
                        <b>[b]</b>ob
                    </li>
                    <li>si
                        <b>[n]</b>gle
                    </li>
                    <li>t
                        <b>[h]</b>at's all
                    </li>
                    <li>s
                        <b>[t]</b>and next
                    </li>
                </ul>
                You can read more on our <a href="/help">Help page</a>.
            </div>
        </div>
    </div>
</div>
`,
    }); // End help

    Vue.component("wheatley", {
        data: function () {
            return {
                // Set to `true` if Wheatley is enabled in this tower.  If this is `false`, then the
                // Wheatley box will not be shown
                enabled: false,

                // Set by Wheatley to enable/disable the row gen panel
                is_ringing: false,

                // User-specifiable settings
                call_composition: true,
                sensitivity: 0.6,
                use_up_down_in: true,
                stop_at_rounds: true,
                row_gen: {
                    type: "method",
                    title: "Double Norwich Court Bob Major",
                    url: "Double_Norwich_Court_Bob_Major",
                },

                // The tower size that Wheatley think the tower has been switched to.  We need to
                // track this because the addition of autoblur causes two `c_size_change` signals to
                // be generated (which would otherwise cause the peal speed to change twice).
                last_tower_size: undefined,
                // Peal speed has 3 values - two which are bound to the input fields, and one
                // combined value that is the 'ground truth'.  This guaruntees that the display
                // always represents the correct peal speed in the correct way (i.e. such that
                // `0 <= peal_speed_mins < 60`.  The dataflow is:
                // - User changes either `peal_speed_hours` or `peal_speed_mins`
                // - `peal_speed_mins` and `peal_speed_hours` are combined to make a new value of
                //   `peal_speed`
                // - The `watch` callback detects the change, and does the following:
                //   - Uses the new value to set `peal_speed_mins` and `peal_speed_hours` to a valid
                //     representation
                //   - Sends a socketio signal with the new peal speed
                peal_speed_hours: "2", // (string): Bound to the value of 'hours' UI box
                peal_speed_mins: "55", // (string): Bound to the value of 'mins' UI box
                // Number value of the total mins of the peal speed.  Sent over SocketIO and
                // computed with `peal_speed_hours * 60 + peal_speed_mins`.
                peal_speed: 175,
                // If `true` then, when the tower size is changed, `peal_speed` will be updated in
                // order to preserve the gap between bells - i.e. keep the apparent rhythm constant.
                //
                // This exists to prevents situations where switching from (e.g.) 6 to 12 bells
                // causes Wheatley to ring extremely fast (because Wheatley is trying to fit ~2x
                // more bells into the same amount of time).  If `fixed_striking_interval` is set,
                // then RR will instead double the peal speed and keep the same apparent speed.
                fixed_striking_interval: false,

                // Row-gen panel configuration
                row_gen_panel: "method", // "method" | "composition": Which tab is open

                method_name: "",
                autocomplete_options: [],
                selected_option: 0,

                complib_url: "",
                current_complib_comp: undefined,
                complib_message: "",
                complib_message_is_error: false,
            };
        },

        computed: {
            display_text: function () {
                if (this.autocomplete_options.length == 0) {
                    return "NOWT";
                }
                return this.autocomplete_options.map((x) => x.title).join(", ");
            },

            touch_link: function () {
                let row_gen = this.row_gen;
                if (!row_gen) {
                    return "";
                }
                switch (row_gen.type) {
                    case "method":
                        return (
                            "https://rsw.me.uk/blueline/methods/view/" +
                            (row_gen.url || "Grandsire_Major")
                        );
                    case "composition":
                        return row_gen.url || "";
                    default:
                        return "";
                }
            },

            touch_text: function () {
                let row_gen = this.row_gen;
                if (!row_gen) {
                    return "<no row gen>";
                }
                switch (row_gen.type) {
                    case "method":
                        return row_gen.title || "No Method Title";
                    case "composition":
                        return row_gen.title || "No Composition Title";
                    default:
                        return "<unknown row_gen type " + row_gen.type + ">";
                }
            },

            row_gen_panel_disabled: function () {
                return bell_circle.lock_controls || this.is_ringing;
            },

            settings_panel_disabled: function () {
                return bell_circle.lock_controls;
            },

            host_mode_lock_enabled: function () {
                return this.$root.$refs.controls.lock_controls;
            },
        },

        watch: {
            method_name: function (next_value) {
                this.update_method_suggestions(next_value);
            },

            complib_url: function (next_value) {
                this.update_comp_suggestions(next_value);
            },

            peal_speed_mins: function (new_value) {
                if (new_value && !isNaN(parseInt(new_value))) {
                    this.update_peal_speed();
                }
            },

            peal_speed_hours: function (new_value) {
                if (new_value && !isNaN(parseInt(new_value))) {
                    this.update_peal_speed();
                }
            },

            // Update the UI whenever the backing `peal_speed` value changes
            peal_speed: function () {
                // Clamp the peal speed to a max of 8 hours
                this.peal_speed = Math.max(Math.min(this.peal_speed, 8 * 60), 60);
                // Update the controls to the correct representation of the speed
                this.peal_speed_mins = (this.peal_speed % 60).toString();
                this.peal_speed_hours = Math.floor(this.peal_speed / 60).toString();
            },
        },

        methods: {
            /* METHODS CALLED WHEN THE USER CHANGES THE CONTROLS */

            // NOTE: These are called specifically when a **user** changes the controls, not simply
            // when the variables change (i.e. these aren't 'watcher' callbacks for the underlying
            // variable).  If these _where_ watchers, then each socket signal received would trigger
            // the callback, thus sending _another_ socket signal.  This causes an infinite echo
            // chamber of socket signals, which would effectively immobilise the controls, as well
            // as causing enormous stress to the Ringing Room server.

            on_change_sensitivity: function () {
                socketio.emit("c_wheatley_setting", {
                    tower_id: cur_tower_id,
                    settings: { sensitivity: this.sensitivity },
                });
            },

            on_change_call_composition: function () {
                socketio.emit("c_wheatley_setting", {
                    tower_id: cur_tower_id,
                    settings: { call_composition: this.call_composition },
                });
            },

            on_change_use_up_down_in: function () {
                socketio.emit("c_wheatley_setting", {
                    tower_id: cur_tower_id,
                    settings: { use_up_down_in: this.use_up_down_in },
                });
            },

            on_change_stop_at_rounds: function () {
                socketio.emit("c_wheatley_setting", {
                    tower_id: cur_tower_id,
                    settings: { stop_at_rounds: this.stop_at_rounds },
                });
            },

            on_change_peal_speed: function () {
                socketio.emit("c_wheatley_setting", {
                    tower_id: cur_tower_id,
                    settings: { peal_speed: this.peal_speed },
                });
            },

            on_change_fixed_striking_interval: function () {
                socketio.emit("c_wheatley_setting", {
                    tower_id: cur_tower_id,
                    settings: { fixed_striking_interval: this.fixed_striking_interval },
                });
            },

            // Updates the peal speed if the tower size changes, in order to keep the intervals
            // between bells as consistent as possible
            on_tower_size_change: function (old_size, new_size) {
                if (this.last_tower_size != undefined && new_size == this.last_tower_size) {
                    return; // Don't update the peal size if we've already received this size change
                }
                this.last_tower_size = new_size;

                if (!this.fixed_striking_interval) {
                    return; // Don't update peal speed unless `fixed_striking_interval` is set
                }
                // Compute the number of 'strikes' contained within a handstroke/backstroke pair of
                // rows (the `+ 1` is the handstroke gap).  The ratio between these is the ratio
                // that the peal speed must be adjusted.
                const two_row_length_old = old_size * 2 + 1;
                const two_row_length_new = new_size * 2 + 1;
                const peal_time_ratio = two_row_length_new / two_row_length_old;
                this.peal_speed = Math.round(this.peal_speed * peal_time_ratio);
                // This function is called when a user clicks on a new tower size button.  The line
                // above therefore only changes this user's local view, so we send a
                // `c_wheatley_setting` signal to sync the new setting with the other users, the RR
                // server and Wheatley itself.
                this.on_change_peal_speed();
            },

            // Assign all unassigned bells to Wheatley
            fill_bells: function () {
                for (const bell of bell_circle.$refs.bells) {
                    if (!bell.assigned_user) {
                        // -1 is Wheatley's user ID (see USER_ID in app/wheatley.py)
                        bell.assign_specific_user(-1);
                    }
                }
            },

            reset_wheatley: function () {
                socketio.emit("c_reset_wheatley", { tower_id: cur_tower_id });
            },

            /* CALLBACKS CALLED FROM RECEIVING A SOCKETIO SIGNAL */
            update_settings: function (new_settings) {
                for (const key in new_settings) {
                    const value = new_settings[key];
                    switch (key) {
                        case "sensitivity":
                            this.sensitivity = value;
                            break;
                        case "call_composition":
                            this.call_composition = value;
                            break;
                        case "use_up_down_in":
                            this.use_up_down_in = value;
                            break;
                        case "stop_at_rounds":
                            this.stop_at_rounds = value;
                            break;
                        case "peal_speed":
                            this.peal_speed = value;
                            break;
                        case "fixed_striking_interval":
                            this.fixed_striking_interval = value;
                            break;
                        default:
                            console.log(`Unknown Wheatley setting '${key}'`);
                    }
                }
            },

            update_row_gen: function (new_row_gen) {
                if (new_row_gen) {
                    this.row_gen = new_row_gen;
                }
            },

            update_is_ringing: function (new_value) {
                this.is_ringing = new_value;
            },

            update_number_of_bells: function () {
                this.update_method_suggestions(this.method_name);
                this.update_comp_suggestions(this.complib_url);
            },

            update_peal_speed: function () {
                this.peal_speed =
                    parseInt(this.peal_speed_hours) * 60 + parseInt(this.peal_speed_mins);
            },

            /* METHODS RELATED TO THE USER UPDATING THE ROW_GEN CONTROLS */
            on_stop_touch: function () {
                socketio.emit("c_wheatley_stop_touch", {
                    tower_id: window.tower_parameters.id,
                });
            },

            update_method_suggestions: function (partial_method_name) {
                // Store a reference to 'this' (the vue model) as a local variable, so that it can
                // be used in the JSON get callback to set the autocomplete results.
                var _this = this;
                if (partial_method_name === "") {
                    this.autocomplete_options = [];
                } else {
                    const query_url =
                        "https://rsw.me.uk/blueline/methods/search.json?q=" +
                        partial_method_name +
                        "&stage=" +
                        (bell_circle.number_of_bells - 1) +
                        "," +
                        bell_circle.number_of_bells;
                    $.getJSON(query_url, function (data) {
                        // Set the method suggestions to the first 5 methods, but only if if
                        // this response is from a query with the correct method name (this
                        // stops jittering and bugs if the responses come back in a different
                        if (_this.method_name === data.query.q) {
                            _this.autocomplete_options = data.results.slice(
                                0,
                                WHEATLEY_MAX_METHOD_SUGGESTIONS
                            );
                        }
                    });
                }
            },

            on_method_box_enter: function () {
                if (this.autocomplete_options.length > 0) {
                    this.send_next_method(this.autocomplete_options[0]);
                }
            },

            send_next_method: function (method) {
                // Return early if there aren't any methods
                if (this.autocomplete_options === []) {
                    console.warning("No results to send to Wheatley!");
                    return;
                }
                // A helper function to convert a call from Bob Wallis' data structure:
                // {
                //    cover: int,       // The number of rows covered by the call
                //    every: int,       // Every how many rows the call can be called
                //    from: int,        // The offset of calls from the lead end (e.g. for Stedman calls
                //                         `every` = 6 and `from` = -3 or 3)
                //    notation: string, // The place notation of the call
                //    symbol: string    // The symbol of the call (is '-' for bobs and 's' for singles)
                // }
                // into what Wheatley expects (a map of indices to place notations)
                const convert_call = function (call) {
                    if (call === undefined) {
                        return {};
                    }
                    let converted_call = {};
                    for (let i = 0; i < method.lengthOfLead / call.every; i++) {
                        converted_call[call.from + i * call.every] = call.notation;
                    }
                    return converted_call;
                };
                // Generate the call definitions, with a special case made for Stedman Doubles (for
                // which the singles defined don't work for slow sixes - see
                // https://github.com/kneasle/wheatley/issues/171)
                let bob_def = method.calls ? convert_call(method.calls["Bob"]) : {};
                let single_def = method.calls ? convert_call(method.calls["Single"]) : {};
                if (method.title === "Stedman Doubles") {
                    single_def = {
                        0: "145",
                        6: "345",
                    };
                }
                // Emit the socketio signal to tell Wheatley what to ring
                socketio.emit("c_wheatley_row_gen", {
                    tower_id: window.tower_parameters.id,
                    row_gen: {
                        type: "method",
                        title: method.title,
                        stage: method.stage,
                        notation: method.notation,
                        url: method.url,
                        bob: bob_def,
                        single: single_def,
                    },
                });
                // Clear the method name box
                this.method_name = "";
            },

            update_comp_suggestions: function (url_box_contents) {
                // If the user changed the `Composition` box, then we always invalidate the current
                // Wheatley comp until CompLib replies to our HTTP request.  This should almost
                // certainly be so fast that the user doesn't see it.
                this.current_complib_comp = undefined;
                // If the box is empty, then clear the error box
                if (url_box_contents == "") {
                    this.complib_message = "";
                    return;
                }
                // Try to determine whether the input is a URL or an ID.  To be consistent with CLI
                // Wheatley, we say that the input is an ID if it has the form '<number>' or
                // '<number>?<anything>'.  Otherwise, it is considered a URL.
                url_box_contents = url_box_contents.trim();
                if (url_box_contents.match(/^[0-9]+(?:\?.*)?$/)) {
                    // We think this input is an ID, so turn it into a URL
                    var complib_url = "https://complib.org/composition/" + url_box_contents;
                } else {
                    var complib_url = url_box_contents; // URL box contents is already a URL
                }
                // Normalise the URL by removing `https://` or `http://` off the front (sometimes
                // it's missed off when you copy URLs).  We'll add `https://` again before making
                // HTTP requests
                const complib_url_without_http = complib_url
                    .replace("https://", "")
                    .replace("http://", "")
                    .toLowerCase();
                const url_segments = complib_url_without_http.split("/");
                // Do some basic validation of the URL
                if (!complib_url_without_http.startsWith("complib.org")) {
                    this.complib_message = "URL doesn't point to 'complib.org'.";
                    this.complib_message_is_error = true;
                    return;
                }
                if (url_segments.length !== 3 || url_segments[1] !== "composition") {
                    this.complib_message = "URL doesn't point to a composition.";
                    this.complib_message_is_error = true;
                    return;
                }
                if (url_segments.length === 3 && url_segments[2] === "") {
                    this.complib_message = "Composition ID is empty";
                    this.complib_message_is_error = true;
                    return;
                }

                /* Send an HTTP request to `complib.org` to figure out what our composition is
                 * pointing to */

                this.complib_message = "Waiting for CompLib...";
                this.complib_message_is_error = false;
                let api_url = "https://api." + complib_url_without_http;
                let standard_url = "https://" + complib_url_without_http;

                let _this = this; // Keep a reference to the correct 'this'

                $.getJSON(api_url)
                    .fail(function (evt) {
                        _this.current_complib_comp = undefined;
                        // Extract the ID from the URL for use in the error message (the ID spans
                        // from the last '/' to the next '?').
                        let last_url_segment = standard_url.substring(standard_url.lastIndexOf("/") + 1);
                        let complib_id = last_url_segment.split("?")[0];

                        // Present an appropriate error message
                        _this.complib_message_is_error = true;
                        if (evt.status == 404) {
                            // Our old favourite, '404 Not found'
                            _this.complib_message = "Composition #" + complib_id + " doesn't exist.";
                        } else if (evt.status == 401) {
                            // 'Unauthorised'
                            _this.complib_message = "Composition #" + complib_id + " is private.";
                        } else if (500 <= evt.status && evt.status < 600) {
                            // Server error
                            _this.complib_message = "CompLib server error.";
                        } else {
                            // Unknown status
                            _this.complib_message = `Unknown request status: ${evt.status}`;
                        }
                    })
                    .done(function (data) {
                        if (
                            data.stage == bell_circle.number_of_bells ||
                            data.stage == bell_circle.number_of_bells - 1
                        ) {
                            _this.current_complib_comp = {
                                url: standard_url,
                                title: data.derivedTitle,
                            };
                            _this.complib_message_is_error = false;
                        } else {
                            _this.current_complib_comp = undefined;
                            let required_tower_size =
                                data.stage % 2 == 0 ? data.stage : data.stage + 1;
                            _this.complib_message =
                                "Comp needs " +
                                required_tower_size +
                                " bells, not " +
                                bell_circle.number_of_bells;
                            _this.complib_message_is_error = true;
                        }
                    });
            },

            send_next_comp: function () {
                if (!this.current_complib_comp) return; // Bail if the comp isn't defined

                this.complib_url = ""; // Clear the composition box

                console.log("Setting Wheatley composition to " + this.current_complib_comp);
                socketio.emit("c_wheatley_row_gen", {
                    tower_id: window.tower_parameters.id,
                    row_gen: {
                        type: "composition",
                        url: this.current_complib_comp.url,
                        title: this.current_complib_comp.title,
                    },
                });
            },
        },

        template: `
<div class="card mb-3" id="wheatley" v-if="enabled && !host_mode_lock_enabled">
    <!-- Wheatley header -->
    <div class="card-header d-flex">
        <h2 style="display: inline; cursor: pointer;"
            class="mr-auto"
            id="wheatley_header"
            data-toggle="collapse"
            data-target="#wheatley_body"
            title="A computer ringer for Ringing Room, designed as a 'ninja helper with no ego'."
        >
            Wheatley
        </h2>
        <!-- Fill in Wheatley -->
        <button class="btn btn-outline-primary btn-block"
                style="width: max-content;"
                :class="{disabled: settings_panel_disabled}"
                @click="fill_bells"
                title="Assign all unassigned bells to Wheatley"
        >
            Fill In
        </button>
    </div>
    <div class="card-body collapse show"
         id="wheatley_body"
         >
        <!-- WHEATLEY ROW GEN SECTION -->
        <p>[[ is_ringing ? "Currently ringing " : "After 'Look To', Wheatley will ring " ]]
            <a :href="touch_link" target="_blank">[[ touch_text ]]</a>.
        </p>

        <div v-if="is_ringing">
            <button class="btn btn-outline-primary btn-block"
                    :class="{disabled: settings_panel_disabled}"
                    @click="on_stop_touch"
                    title="Makes Wheatley stand his bells regardless of what the ringing is doing."
            >
                Stop Touch
            </button>

            <br/>
        </div>

        <!-- Up Down In -->
        <div v-show="row_gen.type == 'composition'">
            <input type="checkbox"
                   v-model="call_composition"
                   v-on:change="on_change_call_composition"
                   name="call_composition"
                   />
            <label for="call_composition" title="If checked, Wheatley will automatically add calls when ringing compositions.">
                Wheatley makes calls
            </label>

            <hr/>
        </div>

        <div id="wheatley_row_gen_box">
            <!-- Wheatley row gen type toggle -->
            <div class="btn-group btn-block btn-group-toggle">
                <label class="btn btn-outline-primary"
                       style="border-bottom-left-radius: 0;"
                       :class="{active: row_gen_panel == 'method',
                                disabled: row_gen_panel_disabled}">
                    <input type="radio"
                           name="row_gen_type"
                           id="row_gen_type_method"
                           value="method"
                           v-model="row_gen_panel"
                           />
                    Method
                </label>
                <label class="btn btn-outline-primary"
                       style="border-bottom-right-radius: 0;"
                       :class="{active: row_gen_panel == 'composition',
                                disabled: row_gen_panel_disabled}">
                    <input type="radio"
                           name="row_gen_type"
                           id="row_gen_type_composition"
                           value="composition"
                           v-model="row_gen_panel"
                           />
                    Composition
                </label>
            </div>

            <div id="wheatley_row_gen_box_inner">
                <!-- Wheatley method tab -->
                <div v-show="row_gen_panel == 'method'">
                    <div>
                        <form action="" @submit.prevent="on_method_box_enter">
                            <input type="text"
                                   id="wheatley_method_name_box"
                                   class="form-control"
                                   style="border-top-left-radius: 0; border-top-right-radius: 0;"
                                   v-model="method_name"
                                   placeholder="Start typing method name..."
                                   :disabled="row_gen_panel_disabled"
                                   autocomplete="off"
                                   />
                        </form>
                        <div id="wheatley_method_suggestion_box">
                            <a v-for="(suggestion, index) in autocomplete_options"
                               href="#"
                               @click.prevent="send_next_method(suggestion)"
                               style="background-color: transparent !important;">
                                [[ index == selected_option ? '> ' : '' ]][[ suggestion.title ]]
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Wheatley composition tab -->
                <div v-show="row_gen_panel == 'composition'">
                    <form action="" @submit.prevent="send_next_comp">
                        <div class="input-group">
                            <input type="text"
                                   id="wheatley_comp_id_box"
                                   class="form-control"
                                   style="border-top-left-radius: 0;"
                                   v-model="complib_url"
                                   :disabled="row_gen_panel_disabled"
                                   placeholder="CompLib URL or ID..."
                                   autocomplete="off"
                                   />
                            <div class="input-group-append">
                                <input class="btn btn-outline-primary"
                                       style="border-top-right-radius: 0;"
                                       type="submit"
                                       :class="{disabled: row_gen_panel_disabled}"
                                       :disabled="row_gen_panel_disabled || !current_complib_comp"
                                       value="Load"
                                       />
                            </div>
                        </div>
                        <div>
                            <p style="margin-bottom: 0;
                                      text-align: center;"
                               :class="{wheatley_error: complib_message_is_error}">
                                [[ current_complib_comp ? current_complib_comp.title : complib_message ]]
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <hr/>

        <!-- WHEATLEY SETTINGS SECTION -->

        <!-- Sensitivity (currently not implemented in Wheatley) -->
        <!--
        <p style="margin-bottom: 0;">Sensitivity:</p>
        <input type="range"
               v-model="sensitivity"
               v-on:change="on_change_sensitivity"
               min=0
               max=1
               step=0.05
               id="wheatley_sensitivity_slider"
               class="volume_control_slider custom-range align-middle"
               :disabled="settings_panel_disabled"
               />
        <br/>
        -->

        <!-- Peal Speed -->
        <p style="margin-bottom: 0.6rem;">Peal Speed:
            <input type="number"
                   id="wheatley_peal_speed_hours"
                   class="wheatley-speed-wheel"
                   v-model="peal_speed_hours"
                   v-on:change="on_change_peal_speed"
                   style="width: 1.5em;"
            />hr
            <input type="number"
                   id="wheatley_peal_speed_mins"
                   class="wheatley-speed-wheel"
                   v-model="peal_speed_mins"
                   v-on:change="on_change_peal_speed"
                   style="width: 2.1em;"
                   step="5"
            />min
        </p>
        <input type="checkbox"
               v-model="fixed_striking_interval"
               v-on:change="on_change_fixed_striking_interval"
               id="wheatley_fixed_striking_interval"
               name="fixed_striking_interval"
               :disabled="settings_panel_disabled"
               />
        <label for="fixed_striking_interval"
               title="When adding/removing bells, change peal speed to keep the same gap between bells">
            Fixed striking interval
        </label>
        <br/>

        <hr/>

        <!-- Up Down In -->
        <input type="checkbox"
               v-model="use_up_down_in"
               v-on:change="on_change_use_up_down_in"
               name="up_down_in"
               :disabled="settings_panel_disabled"
               />
        <label for="up_down_in" title="If checked, Wheatley will go into changes after two rounds.">
            Whole pull and off
        </label>
        <br/>

        <!-- Stop at Rounds -->
        <input type="checkbox"
               v-model="stop_at_rounds"
               v-on:change="on_change_stop_at_rounds"
               id="wheatley_stop_at_rounds"
               name="stop_at_rounds"
               :disabled="settings_panel_disabled"
               />
        <label style=" margin-bottom: 0.1rem;"
               for="stop_at_rounds"
               title="If checked, Wheatley will stand his bells when rounds occurs when ringing method."
        >
            Stop at rounds
        </label>

        <hr/>

        <!-- Reset Wheatley -->
        <button class="btn btn-outline-primary btn-block"
                style="margin-top: 1rem"
                :class="{disabled: settings_panel_disabled}"
                @click="reset_wheatley"
                title="If Wheatley is playing up, pressing this will completely reset Wheatley."
        >
            Reset Wheatley
        </button>
    </div>
</div>
`,
    }); // End Wheatley box

    Vue.component("chatbox", {
        data: function () {
            return {
                name: window.tower_parameters.cur_user_name,
                cur_msg: "",
                messages: [],
            };
        },

        props: ["unread_messages"],

        methods: {
            send_msg: function () {
                // console.log('send_msg');
                socketio.emit("c_msg_sent", {
                    user: this.name,
                    email: window.tower_parameters.cur_user_email,
                    msg: this.cur_msg,
                    time: new Date(),
                    tower_id: window.tower_parameters.id,
                });
                this.cur_msg = "";
            },

            remove_all_unreads: function () {
                bell_circle.unread_messages = 0;
            },
        },

        template: `
<div class="card" id="chatbox">
    <div class="card-header">
        <h2 style="display: inline; cursor: pointer;"
                   id="chat_header"
                   data-toggle="collapse"
                   data-target="#chat_body"
                   >
            Chat
            <span class="badge badge-dark" v-if="unread_messages > 0"> [[ unread_messages ]] </span>
            <span class="sr-only" v-if="unread_messages > 0">unread messages</span>
        </h2>
    </div>
    <div class="card-body collapse show"
                id="chat_body"
                >
        <div class="row no-gutters p-0" id="chat_messages">
            <div class="col p-0">
                <div class="message" v-for="msg in messages">
                    <span class="msg_username">[[msg.user]]:</span>
                    <span class="msg_msg">[[msg.msg]]</span>
                </div>
            </div>
        </div>
        <div class="row no-gutters p-0" id="chat_input">
            <div class="col p-o">
                <form action="" @submit.prevent="send_msg">
                    <div class="input-group">
                        <input type="text"
                               id="chat_input_box"
                               class="form-control"
                               placeholder=""
                               v-model="cur_msg"
                               @focus="remove_all_unreads"
                               />
                        <div class="input-group-append">
                            <input class="btn btn-outline-primary"
                                   type="submit"
                                   value="Send"
                                   />
                        </div>
                    </div>
                </form>
            </div>
            <div class="row my-n1 p-0">
                <div class="col mb-n2 pb-0">
                    <small style="font-size: 1rem;">
                        <a href="#"
                           data-toggle="modal"
                           data-target="#code_of_conduct"
                           >
                            Code of Conduct
                        </a> &#8226;
                        <a href="#"
                           data-toggle="modal"
                           data-target="#report_box"
                           >
                            Report behavior
                        </a>
                    </small>
                </div>
            </div>
        </div>
    </div>
</div>
`,
    });

    // For silly CSS reasons, this needs to be it's own Vue instance
    var report_form = new Vue({
        el: "#report_box",

        data: {
            report_description: "",
            unsubmitted: true,
        },

        methods: {
            send_report: function () {
                socketio.emit("c_report", {
                    time: new Date(),
                    user: window.tower_parameters.cur_user_name,
                    email: window.tower_parameters.cur_user_email,
                    report_description: this.report_description,
                    messages: bell_circle.$refs.chatbox.messages,
                });
                this.unsubmitted = false;

                setTimeout(function () {
                    $("#report_box").modal("hide");
                    report_form.unsubmitted = true;
                    report_form.report_description = "";
                }, 3000);
            },
        },

        template: `
<div id="report_box"
         tabindex="-1"
         class="modal fade">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Report inappropriate behavior</h4>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group" v-if="unsubmitted">
                    <textarea id="report_textarea"
                              class="form-control"
                              rows="4"
                              v-model="report_description"
                              placeholder="Please describe the behavior you would like to report."></textarea>
                </div>
                <div v-else>
                    <p>Thank you — your report and a log of the chat has been submitted to the developers.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button"
                        class="btn btn-secondary" data-dismiss="modal">
                    [[ unsubmitted ? 'Cancel' : 'Close' ]]
                </button>
                <button type="button"
                        v-if="unsubmitted"
                        class="btn btn-primary"
                        @click="send_report"
                        >
                    Send report
                </button>
            </div>
        </div>
    </div>
</div>
`,
    });

    Vue.component("volume_control", {
        data: function () {
            return {
                value: window.user_parameters.bell_volume,
            };
        },

        watch: {
            value: function (new_value) {
                window.user_parameters.bell_volume = new_value;
                let md =
                    this.$root.$refs.controls.audio_type == "Tower" ||
                    this.$root.$refs.controls.audio_type == "Muffled"
                        ? 1.0
                        : window.user_parameters.handbell_mod;
                bell_circle.audio._volume = md * window.user_parameters.bell_volume * 0.1;
                muffled._volume = md * window.user_parameters.bell_volume * 0.1;
                calls._volume = md * window.user_parameters.bell_volume * 0.1;
            },
        },

        template: `
<div class="row justify-content-between mt-n2 px-0 pt-2">
    <!-- slider bar overlaps its own padding, so put it in a div to make it line up with the edges-->
    <div class="col-2 pl-4">
        <i class="fas fa-volume-down volume_icon align-middle"></i>
    </div>
    <div class="col-8 px-0 align-middle">
        <input type="range"
               v-model="value"
               min=0
               max=10
               id="volumeSlider"
               class="volume_control_slider custom-range align-middle autoblur"
               />
    </div>
    <div class="col-2">
        <i class="fas fa-volume-up volume_icon align-middle"></i>
    </div>
</div>
`,
    });

    // user holds individual user data
    Vue.component("user_data", {
        props: ["user_id", "username", "badge", "selected"],

        data: function () {
            return {
                kicking: false,
                circled_digits: [
                    "①",
                    "②",
                    "③",
                    "④",
                    "⑤",
                    "⑥",
                    "⑦",
                    "⑧",
                    "⑨",
                    "⑩",
                    "⑪",
                    "⑫",
                    "⑬",
                    "⑭",
                    "⑮",
                    "⑯",
                ],
            };
        },

        computed: {
            bells_assigned_to_user: function () {
                // console.log('updating bells_assigned');
                // Hack to get around Vue reactivity issues:
                // Referencing $root.number_of_bells ensures that this
                // is recalculated whenever the towersize changes —
                // which in turn ensures that it is dependent on the newly-created
                // bell components and reacts to assignment on them.
                this.$root.number_of_bells;
                var bell_list = [];
                try {
                    // Sometimes this fails because the bells haven't been created yet
                    // In that case, wait and try again
                    this.$root.$refs.bells.forEach((bell, index) => {
                        if (bell.assigned_user == this.user_id) {
                            bell_list.push(index + 1);
                        }
                    });
                } catch (err) {
                    setTimeout(100, function () {
                        this.$root.$refs.bells.forEach((bell, index) => {
                            if (bell.assigned_user == this.user_id) {
                                bell_list.push(index + 1);
                            }
                        });
                    });
                }
                return bell_list;
            },

            assigned_bell_string: function () {
                var output = "";
                this.bells_assigned_to_user.forEach((bell, index) => {
                    output += this.circled_digits[bell - 1];
                });
                return output;
            },

            assignment_mode_active: function () {
                return this.$root.$refs.users.assignment_mode;
            },

            kickable: function () {
                if (this.assignment_mode_active) return false;
                if (this.$root.$refs.controls.lock_controls) return false;
                if (!window.tower_parameters.host_permissions) return false;
                if (this.user_id === parseInt(window.tower_parameters.cur_user_id)) return false;
                if (this.user_id === -1) return false;
                return true;
            },
        },

        methods: {
            select_user: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't do anything if not logged in
                if (this.$root.$refs.controls.lock_controls) {
                    return;
                }
                this.$root.$refs.users.selected_user = this.user_id;
            },

            kick_user: function () {
                if (!this.kicking) {
                    console.log("marking kicking");
                    this.kicking = true;
                    setTimeout(() => (this.kicking = false), 2000);
                    return;
                }
                socketio.emit("c_kick_user", {
                    tower_id: cur_tower_id,
                    user_id: this.user_id,
                });
            },
        },

        template: `
<li class="list-group-item list-group-item-action"
    :class="{assignment_active: selected,
             active: selected,
             clickable: assignment_mode_active}"
    @click="select_user"
    >
    <img v-if="badge"
         v-bind:class="{invert_colors: selected}"
         class="mt-n1 mr-1" width=30 height=30 v-bind:src="'/static/images/' + badge"/>
    [[ username ]]
        <span id="user_assigned_bells" class="float-right pt-1" style="font-size: smaller;">
              [[assigned_bell_string]]
        </span>
        <span class="ml-auto clickable"
            v-if="kickable"
            @click="kick_user"
            >
            <small style="vertical-align: text-bottom;" v-if="kicking">Sure?</small>
            <i v-if="!kicking" class="far fa-window-close"></i>
            <i v-if="kicking" style="color: #b2276e;" class="fas fa-window-close"></i>
        </span>
</li>
`,
    });

    // user_display holds functionality required for users
    Vue.component("user_display", {
        // data in components should be a function, to maintain scope
        data: function () {
            return {
                users: [], // list of {user_id: Int, user_name: Str, badge: Str}
                assignment_mode: false,
                selected_user: null, // user_id
                cur_user: parseInt(window.tower_parameters.cur_user_id),
                cur_user_badge: window.tower_parameters.cur_user_badge,
                observers: parseInt(window.tower_parameters.observers),
            };
        },

        computed: {
            cur_user_bells: function () {
                var bell_list = [];
                this.$root.$refs.bells.forEach((bell, index) => {
                    if (bell.assigned_user === this.cur_user) {
                        bell_list.push(index + 1);
                    }
                });
                return bell_list;
            },

            cur_user_name: function () {
                var cur_username;
                this.users.forEach((user, index) => {
                    if (user.user_id === this.cur_user) {
                        cur_username = user.username;
                    }
                });
                return cur_username;
            },
        },

        methods: {
            toggle_assignment: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't do anything if not logged in
                $("#user_display_body").collapse("show");
                this.assignment_mode = !this.assignment_mode;
                if (this.assignment_mode) {
                    this.selected_user = this.cur_user;
                } else {
                    this.rotate_to_assignment();
                }
            },

            unassign_all: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't do anything if not logged in
                if (this.$root.$refs.controls.lock_controls) {
                    return;
                }
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't do anything if not logged in
                for (const bell of bell_circle.$refs.bells) {
                    bell.unassign();
                }
            },

            rotate_to_assignment: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't do anything if not logged in
                // console.log('rotating to assignment')
                // Don't rotate while assigning bells
                if (this.assignment_mode) {
                    return;
                }

                // Don't rotate if the user has no name yet
                if (!this.cur_user) {
                    return;
                }

                // console.log(this.cur_user_bells);
                // the user has no bells; don't screw with rotation
                if (this.cur_user_bells.length == 0) {
                    // console.log('skipping — no assigned bells');
                    return;
                }

                const rotate_to = bell_circle.find_rope_by_hand(RIGHT_HAND);
                this.$root.rotate(rotate_to);
            },

            add_user: function (user) {
                // console.log('adding user: ', user)
                var flag = false;
                this.users.forEach((u) => {
                    if (u.user_id == user.user_id) {
                        flag = true;
                        return;
                    }
                });
                if (!flag) {
                    this.users.push(user);
                }
            },

            remove_user: function (user) {
                // console.log('removing user: ', user);

                var user_index = -1;
                this.users.forEach((u, index) => {
                    if (u.user_id === user.user_id) {
                        user_index = index;
                        return;
                    }
                });
                if (user_index !== -1) {
                    this.users.splice(user_index, 1);
                }
            },

            get_user_name: function (user_id) {
                var username;
                this.users.forEach((u, index) => {
                    if (u.user_id === user_id) {
                        username = u.username;
                    }
                });
                return username;
            },
        },

        template: `
<div class="card mb-3">
    <div class="card-header"
         v-if="!window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link"
         >
        <h2 style="display: inline; cursor: pointer;"
                   id="user_display_header"
                   class="mr-0"
                   data-toggle="collapse"
                   data-target="#user_display_body">
            Users
        </h2>
        <span class="badge badge-dark ml-2 align-text-bottom"> 
            [[ users.includes(-1) ? users.length - 1 : users.length ]] 
        </span>
        <span class="float-right">
            <button class="btn btn-outline-primary w-100 m-0 autoblur"
                    :class="{active: assignment_mode}"
                    @click="toggle_assignment"
                    >
                [[ assignment_mode ? 'Stop assigning' : 'Assign bells' ]]
            </button>
        </span>
    </div>
    <div class="card-header"
                v-else
                >
        <h2 style="display: inline;">
            Users
        </h2>
    </div>
    <ul class="list-group list-group-flush show"
        id="user_display_body"
        :class="{collapse: (!window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link)}"
        >
        <li class="list-group-item cur_user d-inline-flex align-items-center"
            :class="{assignment_active: assignment_mode,
                     active: cur_user == selected_user && assignment_mode}"
            v-if="window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link"
            >
            <span class="mr-auto">Log in to ring</span>
            <span class="float-right">
                <a class="btn btn-outline-primary btn-sm"
                   :href="'/authenticate?next=' + window.location.pathname">Log In</a>
            </span>
        </li>
        <li class="list-group-item btn btn-outline-primary"
                v-if="assignment_mode && !$root.$refs.controls.lock_controls"
                @click="unassign_all"
                >
            Unassign all
        </li>
        <user_data v-for="u in users"
                   v-if="u.user_id === cur_user && !window.tower_parameters.anonymous_user"
                   :user_id="cur_user"
                   :username="cur_user_name"
                   :badge="cur_user_badge"
                   :selected="selected_user === cur_user && assignment_mode"
                   class="cur_user"
                   ref="cur_user_data"
                   ></user_data>
        <li v-if="$root.$refs.controls.lock_controls"
            class="list-group-item">
            <small class="text-muted">In host mode, you may catch hold, but not assign others.</small>
        </li>
        <user_data v-for="u in users"
              v-if="u.user_id != cur_user"
              :user_id="u.user_id"
              :username="u.username"
              :badge="u.badge"
              :selected="selected_user === u.user_id && assignment_mode"
              ref="user_data"
              :id="cur_user"
              ></user_data>
    </ul>
</div>
`,
    }); // End user_display

    Vue.component("controllers", {
        data: function () {
            return {
                hand_strike: window.user_settings.controller_handstroke,
                back_strike: window.user_settings.controller_backstroke,
                debounce: window.user_settings.controller_debounce,
                buttons: {
                    left: [
                        window.user_settings.controller_left_left,
                        window.user_settings.controller_left_right,
                    ],
                    right: [
                        window.user_settings.controller_right_left,
                        window.user_settings.controller_right_right,
                    ],
                },
                next_ring: 0,
                has_controller: false,
                check_controller: null,
                tick_controller: null,
                active: true,
                controllers_swapped: false,
                notice: "",
                controller_list: [],
                controller_index: [],
                controllers_will_ring: "",
                bell_in_assignment_mode: null,
                circled_digits: [
                    "①",
                    "②",
                    "③",
                    "④",
                    "⑤",
                    "⑥",
                    "⑦",
                    "⑧",
                    "⑨",
                    "⑩",
                    "⑪",
                    "⑫",
                    "⑬",
                    "⑭",
                    "⑮",
                    "⑯",
                ],
                debounce_func: function (cont) {
                    console.log("calling debounce with", cont);
                    cont.debounced = false;
                },
            };
        },

        methods: {
            control_available: function () {
                return "getGamepads" in navigator;
            },

            assign_cont_to_bell: function (cont) {
                if (this.bell_in_assignment_mode) {
                    cont.bell = this.bell_in_assignment_mode;
                    this.bell_in_assignment_mode = null;
                }
            },

            ticktock_controller: function () {
                var nControllers = navigator.getGamepads().length;
                for (var myCont = 0; myCont < nControllers; myCont++) {
                    if (!this.controller_index.includes(myCont)) continue;
                    var cont = navigator.getGamepads()[myCont];
                    var curCont = this.controller_list[myCont];
                    if (curCont && !curCont.debounced) {
                        try {
                            if (Math.max.apply(null, cont.axes.map(Math.abs)) > 0) {
                                var swing = cont.axes[2] * 2048;
                                if (swing >= this.hand_strike && curCont.at_hand) {
                                    curCont.at_hand = !curCont.at_hand;
                                    this.assign_cont_to_bell(curCont);
                                    if (curCont.bell) {
                                        bell_circle.pull_rope(curCont.bell);
                                        curCont.debounced = true;
                                        setTimeout(
                                            function (i) {
                                                i.debounced = false;
                                            }.bind(this, curCont),
                                            this.debounce
                                        );
                                    }
                                }
                                if (
                                    swing <= this.back_strike &&
                                    !curCont.at_hand &&
                                    Date.now() > this.next_ring
                                ) {
                                    curCont.at_hand = !curCont.at_hand;
                                    this.assign_cont_to_bell(curCont);
                                    if (curCont.bell) {
                                        bell_circle.pull_rope(curCont.bell);
                                        curCont.debounced = true;
                                        setTimeout(
                                            function (i) {
                                                i.debounced = false;
                                            }.bind(this, curCont),
                                            this.debounce
                                        );
                                    }
                                }
                            }
                            for (var i = 0; i < cont.buttons.length; i++) {
                                if (cont.buttons[i].pressed && curCont.bell) {
                                    // Determine if this controller should be treated as left- or right-handed
                                    // If bells are assigned to current user, let b be the number of the bell under consideration:
                                    //   1. If b is even and b-1 is also being rung by the user, it's a left-hand bell
                                    //   2. Otherwise, it's a right-hand bell.
                                    // If no bells are assigned to current user: Follow what's done for f&j
                                    //
                                    // The logic here is: Only define left & right for sensible handbell pairs
                                    // Any bell not part of a sensible handbell pair should be able to call bob & single
                                    //

                                    var left_hand = this.assigned_bells
                                        ? curCont.bell === bell_circle.find_rope_by_hand(LEFT_HAND)
                                        : curCont.bell % 2 == 0 &&
                                          this.assigned_bells.includes(curCont.bell - 1);

                                    if (left_hand) {
                                        this.buttons.left[i](this.$root);
                                    } else {
                                        this.buttons.right[i](this.$root);
                                    }
                                }
                            }
                        } catch (err) {}
                    }
                }
            },

            swap_controllers: function () {
                this.controllers_swapped = !this.controllers_swapped;
                this.autoassign_controllers();
                var old_notice = this.notice;
                this.notice = "Swapped";
                setTimeout(() => {
                    this.notice = old_notice;
                }, 2000);
            },

            autoassign_controllers: function () {
                if (this.controller_index.length === 0 || this.controller_index.length > 2) {
                    // Do nothing: autoassignment isn't well defined with more than two controllers
                    return;
                }
                var keys = this.controller_index;
                var first = keys[0];
                if (keys.length > 1) var second = keys[1];
                var left_bell = bell_circle.find_rope_by_hand(LEFT_HAND);
                var right_bell = bell_circle.find_rope_by_hand(RIGHT_HAND);
                this.controller_list[first].bell =
                    this.controllers_swapped && second ? left_bell : right_bell;
                if (second) {
                    this.controller_list[second].bell = !(this.controllers_swapped && second)
                        ? left_bell
                        : right_bell;
                }
                this.controllers_will_ring =
                    second && left_bell
                        ? this.circled_digits[right_bell - 1] + this.circled_digits[left_bell - 1]
                        : this.circled_digits[right_bell - 1];
            },

            set_controllers: function () {
                this.controller_list = [];
                this.controller_index = [];
                var nControllers = navigator.getGamepads().length;
                if (nControllers == 0) {
                    window.clearInterval(this.tick_controller);
                    return;
                }

                for (var myCont = 0; myCont < nControllers; myCont++) {
                    var curCont = navigator.getGamepads()[myCont];
                    if (!curCont) continue;
                    var contObj = {
                        type: "",
                        bell: null,
                        at_hand: true,
                        debounced: false,
                    };
                    if (curCont.id.includes("0ffe") && curCont.connected) {
                        contObj.type = "ActionXL";
                        this.controller_index.push(myCont);
                    } else if (curCont.id.includes("1234") && curCont.connected) {
                        contObj.type = "vJoy";
                    } else if (curCont.id.includes("2341") && curCont.connected) {
                        contObj.type = "eBell";
                        this.controller_index.push(myCont);
                    }
                    this.controller_list[myCont] = contObj;
                }

                this.has_controller = this.controller_index.length > 0;
            },

            toggle_controllers: function () {
                this.active = !this.active;
                if (this.active) {
                    this.set_controllers();
                    window.clearInterval(this.tick_controller);
                    this.tick_controller = window.setInterval(this.ticktock_controller, 15);
                    this.notice = "";
                } else {
                    this.notice = "Disabled";
                    window.clearInterval(this.tick_controller);
                }
            },

            get_assigned_controller_type: function (bell) {
                for (var key in this.controller_list) {
                    if (this.controller_list[key] && this.controller_list[key].bell == bell) {
                        return this.controller_list[key].type;
                    }
                }
                return "No controller";
            },

            put_bell_in_assignment_mode: function (bell) {
                // Disconnect any controllers attached to this bell already
                this.unassign_bell(bell);
                this.bell_in_assignment_mode = bell;
            },

            unassign_bell: function (bell) {
                this.bell_in_assignment_mode = bell; // Reactivity hack: changes what's displayed for the type
                this.bell_in_assignment_mode = null;
                this.controller_list.forEach((cont) => {
                    if (cont.bell == bell) {
                        cont.bell = null;
                    }
                });
            },
        },

        computed: {
            assigned_bells: function () {
                // Reactivity hack: make sure this changes any time assignments do
                this.$root.$refs.users.assignment_mode;
                var bells = [];
                var cur_user_data = bell_circle.$refs.users.$refs.cur_user_data;
                if (cur_user_data) {
                    // We need this check because sometimes this gets mounted before
                    // the cur_user_data does, causing errors
                    bells = cur_user_data[0].bells_assigned_to_user;
                }
                // Disconnect controllers from any bells the user isn't assigned to
                this.controller_list.forEach((cont) => {
                    if (cont.bell && !bells.includes(cont.bell)) {
                        cont.bell = null;
                    }
                });
                this.autoassign_controllers();
                return bells;
            },

            controllers_connected: function () {
                var count = this.controller_index.length;
                return count;
            },
        },

        mounted: function () {
            // console.log('mounting mxp')
            if (this.control_available()) {
                if (this.active) {
                    var instance = this; // smuggle this into the function

                    $(window).on("gamepadconnected", function () {
                        instance.has_controller = true;
                        window.clearInterval(instance.tick_controller);
                        instance.tick_controller = window.setInterval(
                            instance.ticktock_controller,
                            5
                        );
                        instance.set_controllers();
                        window.clearInterval(instance.check_controller);
                    });

                    $(window).on("gamepaddisconnected", function () {
                        window.clearInterval(instance.check_controller);
                        instance.has_controller = false;
                        instance.check_controller = window.setInterval(function () {
                            for (var key in navigator.getGamepads()) {
                                if (navigator.getGamepads()[key]) {
                                    if (!this.has_controller) $(window).trigger("gamepadconnected");
                                }
                            }
                        }, 1000);
                        instance.set_controllers();
                    });
                    instance.check_controller = window.setInterval(function () {
                        if (navigator.getGamepads()[0]) {
                            if (!this.has_controller) $(window).trigger("gamepadconnected");
                        }
                    }, 1000);
                } else {
                    window.clearInterval(tick_controller);
                }
            }
        },

        template: `
        <div class="card mb-3" v-if="has_controller">
            <div class="card-header">
                <h3 style="display: inline; cursor: pointer;"
                    id="controllers_header"
                    data-toggle="collapse"
                    data-target="#controllers_body">
                    Controllers
                </h3>
                <span class="badge badge-dark float-right mt-1" v-if="notice"> [[ notice ]] </span>
                <span class="sr-only" v-if="notice">Controllers swapped</span>
            </div>
            <ul class="list-group list-group-flush show" id="controllers_body" >
                <li class="list-group-item d-flex">
                    <small>Controllers connected:</small>
                    <small class="ml-auto">[[ controllers_connected ]]</small>
                </li>
                <li class="list-group-item d-flex" v-if="controllers_connected <= 2">
                    <small>Ringing bell[[ controllers_connected == 2 ? 's' : '']]:</small>
                    <small class="ml-auto">[[ controllers_will_ring ]]</small>
                </li>
                <li class="list-group-item d-flex"
                    v-if="controllers_connected > 2"
                    v-for="bell in assigned_bells"
                    >
                    <small>
                    [[ circled_digits[bell-1] ]]
                    [[ bell_in_assignment_mode === bell ?
                       "Assigning" : get_assigned_controller_type(bell) ]]
                    </small>
                    <button class="btn btn-outline-primary btn-sm unassign ml-1"
                       v-if="get_assigned_controller_type(bell) !== 'No controller'"
                       @click="unassign_bell(bell)"
                       >
                        <i class="fas fa-window-close p-0 m-0"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary ml-auto"
                        @click="put_bell_in_assignment_mode(bell)"
                        >
                        Assign
                    </button>
                </li>
                <li class="list-group-item"
                    v-if="controllers_connected > 2 && assigned_bells.length == 0"
                    >
                    With 3 or more controllers, you must be assigned to bells to ring.
                </li>

                <li class="list-group-item">
                    <div class="row pb-0">
                        <div class="col p-1">
                            <button class="btn btn-outline-primary w-100"
                                    @click="toggle_controllers"
                                    >
                                    [[ active ? "Disable" : "Enable" ]]
                            </button>
                        </div>
                        <div class="col p-1" v-if="controllers_connected == 2">
                            <button class="btn btn-outline-primary w-100"
                                    @click="swap_controllers"
                                    >
                                    Swap
                            </button>
                        </div>
                    </div>
                </li>
            </div>
        </div>
        `,
    }); // End controllers

    // The master Vue application
    bell_circle = new Vue({
        el: "#bell_circle",

        mounted: function () {
            /////////////////
            /* Tower setup */
            /////////////////

            // set this separately so that the watcher fires
            this.number_of_bells = window.tower_parameters.size;

            // Join the tower
            socketio.emit("c_join", {
                tower_id: cur_tower_id,
                user_token: window.tower_parameters.user_token,
                anonymous_user: window.tower_parameters.anonymous_user,
            });
            $('[data-toggle="tooltip"]').tooltip();

            this.$nextTick(function () {
                this.$refs.users.rotate_to_assignment();
                if (!window.tower_parameters.anonymous_user) {
                    // console.log('turning on keypress listening')
                    _bind_hotkeys(bell_circle);
                }

                $("*").focus(() => {
                    if (document.activeElement.classList.contains("autoblur")) {
                        document.activeElement.blur();
                    }
                });
            });
        },

        data: {
            number_of_bells: 0,
            bells: [],
            rang_bell_recently: [],
            swapped_bell_recently: [],
            audio: audio_types[window.tower_parameters.audio],
            call_throttled: false,
            tower_name: window.tower_parameters.name,
            tower_id: parseInt(window.tower_parameters.id),
            hidden_sidebar: true,
            hidden_help: true,
            unread_messages: 0,
            host_mode: window.tower_parameters.host_mode,
            bookmarked: window.tower_parameters.bookmarked,
            anticlockwise: window.tower_parameters.anticlockwise,
            accessibility_overlay: false,
        },

        watch: {
            // Change the list of bells to track the current number
            number_of_bells: function (new_count) {
                // console.log('changing number of bells to ' + new_count)
                const new_bells = [];
                //const new_users = [];
                for (var i = 1; i <= new_count; i++) {
                    // console.log('pushing bell: ' + i);
                    new_bells.push({
                        number: i,
                        position: i,
                    });
                    // console.log(new_bells);
                }
                // console.log(new_bells);

                this.bells = new_bells;
                this.rang_bell_recently = new Array(new_count).fill(false);
                this.swapped_bell_recently = new Array(new_count).fill(false);
                // Request the global state from the server
                socketio.emit("c_request_global_state", {
                    tower_id: cur_tower_id,
                });
            },
        },

        methods: {
            // the server rang a bell; find the correct one and ring it
            ring_bell: function (bell) {
                // console.log("Ringing the " + bell)
                this.$refs.bells[bell - 1].ring();
            },

            // Trigger a specific bell to emit a ringing event
            pull_rope: function (bell) {
                if (this.rang_bell_recently[bell - 1]) {
                    return;
                }
                // console.log("Pulling the " + bell);
                this.$refs.bells[bell - 1].emit_ringing_event();
                this.rang_bell_recently[bell - 1] = true;
                setTimeout(() => {
                    this.rang_bell_recently[bell - 1] = false;
                }, 250);
            },

            // Like ring_bell, but calculated by the position in the circle (respecting rotation)
            ring_bell_by_pos: function (pos) {
                for (bell in this.bells) {
                    if (this.bells[bell]["position"] == pos) {
                        this.ring_bell(this.bells[bell]["number"]);
                        return true;
                    }
                }
            },

            find_rope_by_pos: function (pos) {
                for (var bell in this.bells) {
                    if (this.bells[bell]["position"] == pos) {
                        // this.pull_rope(this.bells[bell]['number']);
                        return this.bells[bell]["number"];
                    }
                }
            },

            // Like pull_rope, but calculated by the position in the circle (respecting rotation)
            pull_rope_by_pos: function (pos) {
                var bell_to_pull = this.find_rope_by_pos(pos);
                this.pull_rope(bell_to_pull);
            },

            // Figure out which bell is the 'left' or 'right' hand bell
            find_rope_by_hand: function (hand) {
                // Drop out of this function if `hand` is invalid
                if (!hand || (hand !== LEFT_HAND && hand !== RIGHT_HAND)) {
                    console.error("Unknown value of 'hand': '" + hand + "'.");

                    return;
                }

                // Collect the numbers of the bells that belong to the current user
                let current_user_bells = [];
                for (var i = 0; i < this.$refs.bells.length; i++) {
                    const bell = this.$refs.bells[i];
                    if (bell.assigned_user == window.tower_parameters.cur_user_id) {
                        current_user_bells.push(bell.number);
                    }
                }
                // Make sure that the bells are always in ascending order
                // The magic incantation function is necessary because JS defaults to sorting
                // integers... alphabetically. No, seriously.
                current_user_bells.sort(function (a, b) {
                    return a - b;
                });

                /* Use these to decide which bells should be in the user's left and right hands. */
                // CASE 1: No bells are assigned
                if (current_user_bells.length == 0) {
                    // If no bells are assigned, fall back to the behaviour of 'left' and 'right'
                    // being the two bells on the bottom of the screen
                    if (window.tower_parameters.anticlockwise) {
                        if (hand == LEFT_HAND) {
                            return this.find_rope_by_pos(8);
                        } else {
                            return this.find_rope_by_pos(1);
                        }
                    }
                    if (hand == LEFT_HAND) {
                        return this.find_rope_by_pos(2);
                    } else {
                        return this.find_rope_by_pos(1);
                    }
                }

                // CASE 2: Only one bell is assigned.
                // In this case, we should assign it to the right hand, and ignore the left hand
                // key presses
                if (current_user_bells.length == 1 && hand === RIGHT_HAND) {
                    return current_user_bells[0];
                }

                // CASE 3: Exactly two bells are assigned.
                // In this case, we should pair them up the shortest possible way, even if this
                // would wrap over the 'end' of the circle, and assign them as though we are
                // looking in from the outside of the circle
                if (current_user_bells.length == 2) {
                    // Put the first and second bell (by number) into two variables for ease of use
                    const first_bell = current_user_bells[0];
                    const second_bell = current_user_bells[1];

                    // Decide on which way round the bells should be
                    var left_hand_bell;
                    var right_hand_bell;

                    if (second_bell - first_bell <= first_bell + this.bells.length - second_bell) {
                        // The shortest way to pair the bells does not wrap round the 'end' of the
                        // circle
                        left_hand_bell = second_bell;
                        right_hand_bell = first_bell;
                    } else {
                        // The shortest way to pair the bells *does* wrap round the 'end' of the
                        // circle
                        left_hand_bell = first_bell;
                        right_hand_bell = second_bell;
                    }

                    // We know that hand is one of `LEFT_HAND` or `RIGHT_HAND` because
                    // otherwise the function would have returned early
                    if (window.tower_parameters.anticlockwise) {
                        if (hand === LEFT_HAND) {
                            return right_hand_bell;
                        } else {
                            return left_hand_bell;
                        }
                    }
                    if (hand === LEFT_HAND) {
                        return left_hand_bell;
                    } else {
                        return right_hand_bell;
                    }
                }

                // CASE 4: There are more than 2 bells assigned.
                // In this case, it is badly defined what bells to ring, so we ring the two lowest
                // numbered bells since this will make sense most of the time.
                if (current_user_bells.length > 2) {
                    // We know that hand is one of `LEFT_HAND` or `RIGHT_HAND` because
                    // otherwise the function would have returned early
                    if (window.tower_parameters.anticlockwise) {
                        if (hand === LEFT_HAND) {
                            return current_user_bells[0];
                        } else {
                            return current_user_bells[1];
                        }
                    }
                    if (hand === LEFT_HAND) {
                        return current_user_bells[1];
                    } else {
                        return current_user_bells[0];
                    }
                }
            },

            // Pull the 'left' or 'right' hand bell
            pull_rope_by_hand: function (hand) {
                var bell_to_ring = this.find_rope_by_hand(hand);
                this.pull_rope(bell_to_ring);
            },

            // Silently swap the bell in a given hand
            silent_swap_by_hand: function (hand) {
                var bell_to_swap = this.find_rope_by_hand(hand);
                if (this.swapped_bell_recently[bell_to_swap - 1]) {
                    return;
                }
                socketio.emit("c_silent_swap", {
                    bell: bell_to_swap,
                    tower_id: cur_tower_id,
                });
                this.swapped_bell_recently[bell_to_swap - 1] = true;
                setTimeout(() => {
                    this.swapped_bell_recently[bell_to_swap - 1] = false;
                }, 250);
            },

            // emit a call
            make_call: function (call) {
                if (
                    this.$root.$refs.users.cur_user_bells.length == 0 &&
                    this.$root.$refs.controls.lock_controls
                ) {
                    // user is not allowed to make calls
                    this.$root.$refs.display.display_message(
                        "Only hosts may make calls when not assigned to a bell."
                    );

                    return;
                }
                if (this.call_throttled) {
                    return;
                }
                socketio.emit("c_call", {
                    call: call,
                    tower_id: cur_tower_id,
                });
                this.call_throttled = true;
                setTimeout(() => {
                    this.call_throttled = false;
                }, 500);
            },

            // rotate the view of the circle
            rotate: function (newposs) {
                if (newposs > this.number_of_bells) {
                    // the user tried to rotate to a bell that doesn't exist
                    return false;
                }

                // how many positions to rotate?
                var offset = this.number_of_bells - newposs;
                var n_b = this.number_of_bells;

                for (var bell in this.bells) {
                    // change the position of each bell
                    var number = this.bells[bell]["number"];
                    this.bells[bell]["position"] = ((number + offset) % n_b) + 1;
                }

                // We need the Vue's list to be sorted by position
                this.bells = this.bells.sort(function (a, b) {
                    return a["position"] - b["position"];
                });
            },

            set_bells_at_hand: function () {
                if (window.tower_parameters.anonymous_user) {
                    return;
                } // don't do anything if not logged in
                // console.log('setting all bells at hand')
                socketio.emit("c_set_bells", {
                    tower_id: cur_tower_id,
                });
            },

            toggle_controls: function () {
                $("#help").collapse("hide");
                this.hidden_help = true;
                this.hidden_sidebar = !this.hidden_sidebar;
            },

            toggle_help: function () {
                if (window.tower_parameters.observer) {
                    return;
                } // don't do anything if in listener mode
                $("div.bell_circle_col").toggleClass("background");
                $("#tower_controls").collapse("hide");
                this.hidden_sidebar = true;
                this.hidden_help = !this.hidden_help;
            },

            copy_id: function () {
                setTimeout(() => {
                    $("#id_clipboard_tooltip").tooltip("hide");
                }, 1000);
                var dummy = document.createElement("textarea");
                document.body.appendChild(dummy);
                dummy.value = cur_tower_id;
                dummy.select();
                document.execCommand("copy");
                document.body.removeChild(dummy);
            },

            toggle_bookmark: function () {
                socketio.emit("c_toggle_bookmark", {
                    tower_id: cur_tower_id,
                    user_token: window.tower_parameters.user_token,
                });
                this.bookmarked = !this.bookmarked;
            },

            leave_tower: function () {
                leave_room();
            },

            toggle_accessibility_overlay: function () {
                this.accessibility_overlay = !this.accessibility_overlay;
            },
        },

        template: `
<div id="bell_circle_wrapper">
    <div v-if="accessibility_overlay" 
         id="accessibility_overlay"
         class="text-right clickable_div"
         @click="pull_rope_by_hand('right')"
         >
        <p id="overlay_warning">
            Mouse Mode enabled.<br/>
            Click anywhere to ring.
            Press <b>[[ user_settings.accessibility_overlay_hotkey ]]</b> to deactivate.
        </p>
    </div>
    <div class="row flex-lg-nowrap" id="sidebar_col_row" :class="{disabled: accessibility_overlay}">
        <div class="col-12 col-lg-4 sidebar_col">
            <!-- sidebar col -->
            <div class="tower_header">
                <div class="row">
                    <div class="col text-nowrap">
                        <i class="fa-bookmark align-text-top fa-fw"
                           :class="[bookmarked ? 'fas' : 'far']"
                           style="cursor:pointer"
                           @click="toggle_bookmark"
                        ></i>
                        <a class="text-secondary" :href="'/tower_settings/' + tower_id"
                           v-if="window.tower_parameters.cur_user_is_creator"
                           data-toggle="tooltip"
                           data-placement="bottom"
                           data-container="body"
                           id="settings_tooltip"
                           title="Go to tower settings">
                            <i class="fas fa-fw fa-cog align-text-top"
                            ></i>
                        </a>
                        <h1 id="tower_name" class="d-inline d-lg-none text-wrap"> [[ tower_name ]] </h1>
                        <h1 id="tower_name" class="d-none d-lg-inline"> [[ tower_name ]] </h1>
                        <span class="badge badge-dark"
                            v-if="hidden_sidebar
                               && unread_messages > 0
                               && !window.tower_parameters.listen_link
                               && !window.tower_parameters.anonymous_user"
                            >
                            New chat!
                        </span>
                        <span class="sr-only"
                            v-if="hidden_sidebar
                               && unread_messages > 0
                               && !window.tower_parameters.listen_link
                               && !window.tower_parameters.anonymous_user"
                            >
                            unread messages
                        </span>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="row justify-content-between no-gutter">
                            <div class="col-auto mb-3 mb-sm-0 pr-0">
                                <div class="tower_id input-group" style="flex-wrap:nowrap">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">[[tower_id]]</span>
                                    </div>
                                    <div class="input-group-append">
                                        <button class="btn btn-outline-primary"
                                                data-toggle="tooltip"
                                                data-placement="bottom"
                                                data-container="body"
                                                data-trigger="click"
                                                id="id_clipboard_tooltip"
                                                @click="copy_id"
                                                title="Copied to clipboard">
                                            <i class="far fa-clipboard fa-fw"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div @click="leave_tower" class="col-auto">
                                <a role="button"
                                id="leave_tower_link_button"
                                class="btn btn-outline-primary d-block"
                                href='/my_towers'
                                >
                                    Leave Tower
                                </a>
                            </div>

                            <div class="col-auto toggle_controls d-lg-none pl-0">
                                <button class="toggle_controls btn btn-outline-primary"
                                        data-toggle="collapse"
                                        data-target="#tower_controls"
                                        @click="toggle_controls"
                                        >
                                    Controls
                                    <span class="badge badge-dark"
                                          v-if="hidden_sidebar
                                             && unread_messages > 0
                                             && !window.tower_parameters.listen_link
                                             && !window.tower_parameters.anonymous_user"
                                          >
                                        [[ unread_messages ]]
                                    </span>
                                    <span class="sr-only"
                                          v-if="hidden_sidebar
                                             && unread_messages > 0
                                             && !window.tower_parameters.listen_link
                                             && !window.tower_parameters.anonymous_user"
                                          >
                                        unread messages
                                    </span>
                                    [[ hidden_sidebar ? '▸' : '▾' ]]
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- tower header -->
            <div class="tower_controls collapse"
                 id="tower_controls"
                 >
                <div class="row justify-content-between align-bottom"
                     style="min-height:3.3rem;">
                    <div class="col">
                        <volume_control ref="volume"></volume_control>
                    </div>
                </div>
                <tower_controls ref="controls"></tower_controls>
                <template v-if="!window.tower_parameters.anonymous_user
                             && !window.tower_parameters.listen_link">
                    <div class="row pb-0 flex-grow-1"
                        v-if="'getGamepads' in navigator">
                        <div class="col flex-grow-1">
                            <controllers ref="controllers"></controllers>
                        </div>
                    </div>
                    <div class="row pb-0 flex-grow-1">
                        <div class="col flex-grow-1">
                            <user_display ref="users"></user_display>
                            <wheatley ref="wheatley"></wheatley>
                            <chatbox ref="chatbox" v-bind:unread_messages="unread_messages"></chatbox>
                        </div>
                    </div>
                </template>
                <template v-else>
                    <div class="row pb-0 flex-grow-1">
                        <div class="col flex-grow-1">
                            <user_display ref="users"></user_display>
                        </div>
                    </div>
                </template>
            </div>
            <!-- hidden sidebar -->
        </div>
        <!-- sidebar col -->
        <div class="col-12 col-lg-8 bell_circle_col">
            <!-- bell circle col -->
            <div class="bell_circle"
                 v-bind:class="[number_of_bells == 4  ? 'four'     : '',
                                number_of_bells == 5  ? 'five'     : '',
                                number_of_bells == 6  ? 'six'      : '',
                                number_of_bells == 8  ? 'eight'    : '',
                                number_of_bells == 10 ? 'ten'      : '',
                                number_of_bells == 12 ? 'twelve'   : '',
                                number_of_bells == 14 ? 'fourteen' : '',
                                number_of_bells == 16 ? 'sixteen'  : '',
                                anticlockwise ? 'anticlockwise' : '']">
                <call_display v-bind:audio="audio" ref="display"></call_display>
                <focus_display ref="focus"></focus_display>
                <bell_rope v-for="bell in bells"
                           v-bind:key="bell.number"
                           v-bind:number="bell.number"
                           v-bind:position="bell.position"
                           v-bind:number_of_bells="number_of_bells"
                           v-bind:audio="audio"
                           v-bind:id="bell.number"
                           ref="bells"
                           ></bell_rope>
            </div>
            <!-- bell_circle -->
        </div>
        <!-- row -->
    </div>
</div>
`,
    }); // end Vue bell_circle
}); // end document.ready
