///////////
/* SETUP */
///////////

// Don't log unless needed
var logger = function()
{
    var oldConsoleLog = null;
    var pub = {};

    pub.enableLogger =  function enableLogger() 
                        {
                            if(oldConsoleLog == null){ return;}

                            window['console']['log'] = oldConsoleLog;
                        };

    pub.disableLogger = function disableLogger()
                        {
                            oldConsoleLog = console.log;
                            window['console']['log'] = function() {};
                        };

    return pub;
}();
logger.disableLogger()

// Set up socketio instance
var socketio = io()

// Get the current tower_id and let the server know where we are
var cur_path = window.location.pathname.split('/')
var cur_tower_id = parseInt(cur_path[1])
socketio.emit('c_join',{tower_id: cur_tower_id})

// Set up a handler for leaving, then register it *everywhere*

var leave_room = function(){
    socketio.emit('c_user_left',
          {user_name: bell_circle.$refs.users.cur_user, 
          tower_id: cur_tower_id,
          observer: false});
}

// set up disconnection at beforeunload
window.addEventListener("beforeunload", leave_room, "useCapture");
window.onbeforeunload = leave_room;


////////////////////////
/* SOCKETIO LISTENERS */
////////////////////////

// A bell was rung
socketio.on('s_bell_rung', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	// if(msg.disagree) {}
	bell_circle.ring_bell(msg.who_rang);
});

// We got a username from the server
// (It might be empty)
socketio.on('s_set_user_name', function(msg, cb){
    console.log('received un: ' + msg.user_name);
    console.log('it is available: ' + msg.name_available)
    bell_circle.$refs.un_input.input = msg.user_name;
    if (!msg.name_available){
        bell_circle.$refs.un_input.user_message = "This username is already taken.";
    }
    if (msg.name_available && msg.user_name){
        bell_circle.$refs.un_input.send_user_name();
    }
});

// getting initial user state
socketio.on('s_set_users', function(msg, cb){
	console.log('Getting users: ' + msg.users);
    bell_circle.$refs.users.user_names = msg.users
});

// User entered the room
socketio.on('s_user_entered', function(msg, cb){
    console.log(msg.user_name + ' entered')
    bell_circle.$refs.users.add_user(msg.user_name);
});

// User left the room
socketio.on('s_user_left', function(msg, cb){
    console.log(msg.user_name + ' left')
    bell_circle.$refs.users.remove_user(msg.user_name);
});

// Number of observers changed
socketio.on('s_set_observers', function(msg, cb){
    console.log('observers: ' + msg.observers);
    bell_circle.$refs.users.observers = msg.observers;
});


// User was assigned to a bell
socketio.on('s_assign_user', function(msg, cb){
    console.log('Received user assignment: ' + msg.bell + ' ' + msg.user);
    bell_circle.$refs.bells[msg.bell - 1].assigned_user = msg.user;
    bell_circle.$refs.users.rotate_to_assignment();
});

// A call was made
socketio.on('s_call',function(msg,cb){
	console.log('Received call: ' + msg.call);
	bell_circle.$refs.display.make_call(msg.call);
});

// The server told us the number of bells in the tower
socketio.on('s_size_change', function(msg,cb){
	var new_size = msg.size;
	bell_circle.number_of_bells = new_size;
});


// The server sent us the global state; set all bells accordingly
socketio.on('s_global_state',function(msg,cb){
	var gstate = msg.global_bell_state;
	for (var i = 0; i < gstate.length; i++){
		bell_circle.$refs.bells[i].set_state_silently(gstate[i]);
	};
});

// The server told us the name of the tower
socketio.on('s_name_change',function(msg,cb){
	console.log('Received name change: ' + msg.new_name);
	bell_circle.tower_name = msg.new_name;
	bell_circle.tower_id = parseInt(cur_tower_id);
});


// The server told us whether to use handbells or towerbells
socketio.on('s_audio_change',function(msg,cb){
  console.log('changing audio to: ' + msg.new_audio);
  bell_circle.$refs.controls.audio_type = msg.new_audio;
  bell_circle.audio = msg.new_audio == 'Tower' ? tower : hand;
});


///////////
/* AUDIO */
///////////

// import {tower, hand, bell_mappings} from './audio.js';

/////////
/* VUE */
/////////

// all vue objects needs to be defined within  document.read, so that the jinja
// templates are rendered first

// However, we need the main Vue to be accessible in the main scope
var bell_circle

$(document).ready(function() {

Vue.options.delimiters = ['[[', ']]']; // make sure vue doesn't interfere with jinja

/* BELLS */

// First, set up the bell component
// number — what bell
// poss — where in the tower (the css class)
// stroke — boolean — is the bell currently at hand?
// ring() — toggle the stroke, then 
Vue.component("bell_rope", {

	props: ["number", "position", "number_of_bells","audio"],

    // data in props should be a function, to maintain scope
	data: function() {
	  return { stroke: true,
			   circled_digits: ["①", "②", "③", "④", "⑤", "⑥", 
								"⑦", "⑧", "⑨", "⑩", "⑪","⑫"],
			   images: ["handstroke", "backstroke"],
               assigned_user: '',
	  };
	},

    computed: {

        image_prefix: function(){
            return this.$root.$refs.controls.audio_type === 'Tower' ? 't-' : 'h-';
        },

        assignment_mode: function(){
            return this.$root.$refs.users.assignment_mode;
        },

        cur_user: function(){
            return this.$root.$refs.users.cur_user;

        },

        left_side: function(){
            if (this.position == 1) { return false };
            if (this.position <= (this.number_of_bells/2)+1) { return true };
            return false;
        },

        top_side: function(){
            if (this.number_of_bells === 4 && this.position >=3) {return true};
            if (this.number_of_bells === 6 && (this.position === 4 || this.position === 5)) 
                {return true};
            if (this.number_of_bells === 8 && this.position >= 4 && this.position !== 8) 
                {return true};
            if (this.number_of_bells === 10 && this.position >= 5 && this.position < 9) 
                {return true};
            if (this.number_of_bells === 12 && this.position >= 5 && this.position <= 10) 
                {return true};
        },

    },

	methods: {

      
      // emit a ringing event ot the server
	  emit_ringing_event: function() {
        if (this.assignment_mode){ return }; // disable while assigning
		socketio.emit('c_bell_rung',
				{bell: this.number, stroke: this.stroke, tower_id: cur_tower_id});
		var report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

      // Ringing event received; now ring the bell
	  ring: function(){
		this.stroke = !this.stroke;
        const audio_type = this.$root.$refs.controls.audio_type;
        console.log(audio_type + ' ' + this.number_of_bells);
		this.audio.play(bell_mappings[audio_type][this.number_of_bells][this.number - 1]);
		var report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	
      // global_state received; set the bell to the correct stroke
	  set_state_silently: function(new_state){
		  console.log('Bell ' + this.number + ' set to ' + new_state)
		  this.stroke = new_state
	  },

      assign_user: function(){
          const selected_user = this.$root.$refs.users.selected_user;
          if (!this.assignment_mode){ return };
          console.log('assigning user: ' +  selected_user + ' to ' + this.number);
          socketio.emit('c_assign_user', { bell: this.number,
                                           user: selected_user,
                                           tower_id: cur_tower_id });
      },

      unassign: function(){
          socketio.emit('c_assign_user', { bell: this.number,
                                           user: '',
                                           tower_id: cur_tower_id });
      },

    },

	template:`
            <div class="bell"
                 :class="[left_side ? 'left_side' : '',
                          image_prefix === 'h-' ? 'handbell' : '']">
                <div class="row"
                    :class="[left_side ? 'flex-row-reverse' :  '',
                             top_side ? 'align-items-start' : 'align-items-end']">

                     <img @click='emit_ringing_event'
                           class="bell_img" 
                          :class="[assignment_mode ? 'assignment_mode' : '']"
                          :src="'static/images/' + image_prefix + (stroke ? images[0] : images[1]) + '.png'"
                          />


                    <div class="bell_metadata">


                    <template v-if="left_side">
                        <div class="btn-group user_cartouche">
                            <button class="btn btn-sm btn_unassign"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-outline-primary' : 'btn-outline-secondary']"
                                v-if="assignment_mode && assigned_user"
                                @click="unassign">
                                <span class="unassign">X</span>
                            </button>

                            <button class="btn btn-small btn_assigned_user"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-outline-primary' : 'btn-outline-secondary']"
                                   @click="assign_user"
                                   v-if="assignment_mode || assigned_user"
                                  > 
                                  <span class="assigned_user">
                                    [[ (assignment_mode) ? 
                                        ((assigned_user) ? assigned_user : '(none)')
                                        : assigned_user ]]
                                  </span>
                             </button>

                             <button class='btn btn-sm btn_number active' 
                                 :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-outline-primary' : 'btn-outline-secondary',
                                          assigned_user == cur_user ? 'cur_user' : '']"
                                  style="cursor: inherit;"
                                  >
                                <span class="number"> [[number]] </number>
                             </button>
                        </div>
                    </template>
                    <template v-else>
                        <div class="btn-group user_cartouche">
                             <button class='btn btn-sm btn_number active' 
                                 :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-outline-primary' : 'btn-outline-secondary',
                                          assigned_user == cur_user ? 'cur_user' : '']"
                                  style="cursor: inherit;"
                                  >
                                <span class="number">[[number]]</span>
                             </button>

                             <button class="btn btn-small btn_assigned_user"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-outline-primary' : 'btn-outline-secondary']"
                                  @click="assign_user"
                                  v-if="assignment_mode || assigned_user"
                                   > 
                                  <span class="assigned_user_name">
                                     [[ (assignment_mode) ? 
                                         ((assigned_user) ? assigned_user : '(none)')
                                         : assigned_user ]]
                                  </span>
                              </button>

                             <button class="btn btn-sm btn_unassign"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-outline-primary' : 'btn-outline-secondary']"
                                    v-if="assignment_mode && assigned_user"
                                    @click="unassign">
                                 <span class="unassign">X</span>
                             </button>
                        </div>
                    </template>

                    </div>
                    </div>
                </div>
            </div>
		     `

}); // End bell_rope component

// The call_display is where call messages are flashed
Vue.component('call_display', {

    props: ["audio"],

    // data in components should be a function, to maintain scope
	data: function(){
		return { cur_call: '' };
	},

	methods: {

        // a call was received from the server; display it and play audio
		make_call: function(call){
			console.log('changing cur_call to: ' + call);
			this.cur_call = call;
			this.audio.play(call);
			var self = this;
            // remove the call after 2 seconds
			setTimeout(function() { self.cur_call = ''; 
						console.log('changing cur_call back');}, 2000);
		}
	},

	template: `<h2 id='call_display' 
                   ref='display'>[[ cur_call ]]
               </h2>
              `
}); // end call_display component


// tower_controls holds title, id, size buttons, audio toggle
Vue.component('tower_controls', {

    // data in components should be a function, to maintain scope
	data: function(){ 
		return {tower_sizes: [4,6,8,10,12],
                audio_type: ''} },

    computed: {
        
        number_of_bells: function() {
            return this.$root.number_of_bells;
        },

    },

    watch: {

        audio_type: function(){
            console.log('swapped audio type');
              socketio.emit('c_audio_change',{new_audio: this.audio_type, tower_id: cur_tower_id});
        },

    },

	methods: {

        // the user clicked a tower-size button
		set_tower_size: function(size){
			console.log('setting tower size to ' + size);
			socketio.emit('c_size_change',{new_size: size, tower_id: cur_tower_id});
		},

        set_bells_at_hand: function(){
            console.log('setting all bells at hand')
            socketio.emit('c_set_bells', {tower_id: cur_tower_id});
        },
	},

	template: 
    `
        <div class="tower_controls_inner">

             <div class="row between-xs">
             <div class="col">
                <div class="btn-group btn-block btn-group-toggle">
                    <label v-for="size in tower_sizes"
                           :size="size"
                           class="btn btn-outline-primary"
                           :class="{active: size === number_of_bells}"
                           @click="set_tower_size(size)"
                           >
                           <input type="radio"
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
                        <label class="btn btn-outline-primary"
                               :class="{active: audio_type == 'Tower'}">
                        <input type="radio" 
                               name="audio"
                               id="audio_tower"
                               value="Tower"
                               v-model="audio_type"
                               />
                               Tower
                        </label>

                        <label class="btn btn-outline-primary"
                               :class="{active: audio_type == 'Hand'}">
                        <input type="radio" 
                               name="audio"
                               id="audio_hand"
                               value="Hand"
                               v-model="audio_type"
                               />
                               Hand
                        </label>
                       </div>
                 </div>

                 <div class="col">
                     <button class="set_at_hand btn btn-outline-primary btn-block"
                           @click="set_bells_at_hand"
                           >
                         Set at hand
                     </button>
                </div>
             </div>

             <user

        </div> <!-- tower controls -->
    `,
}); // End tower_controls





// help holds help toggle
Vue.component('help', {

    // data in components should be a function, to maintain scope
	data: function(){
		return {help_showing: false} },

	methods: {

        // the user clicked the audio toggle
        show_help: function(){
          console.log('showing or hiding help');
          this.help_showing = !this.help_showing

        },
	},


	template: `
			<div class="help">
				<div
				class="help_toggle"
				@click="show_help"
				>
                       <button class="btn btn-outline-primary"> Help [[ help_showing ? '▾' : '▸' ]] </button>
                </div>
                <div v-if="help_showing"
                class="help_showing"
                @click="show_help">
                  	<p>
                  		On the top left, you may set the number of bells in the tower by clicking the desired number. 
                  		To ring, you may either click on the ropes or use the following hot-keys:
                  	</p>
					<ul>
						<li> <b>[1-9], [0], [-], [=]:</b> Rings bells 1 - 9, 10, 11, and 12</li>
						<li><b>[SPACE]:</b> Rings the bell in the lower right corner.</li>
						<li><b>[LEFT] and [RIGHT] arrow keys:</b> Rings the left and right bottom-most bells.</li>
						<li><b>[f] and [j]:</b> same as [LEFT] and [RIGHT]</li>
						<li><b>[SHIFT]+[0-9]\\[0]\\[-]\\[=]:</b> Rotate the "perspective" of the ringing room to put that bell in the lower right corner so it may be rung by [SPACE] or [j].</li>
					</ul>
					<p>
						There are also hot-keys for various calls, but be aware that in some browsers using these 
						results in the sound of the bells being interrupted.
					</p>
					
					<p>Ringers may now <i>assign bells</i> by entering bell assignment mode (top left of the screen). While in
					this mode, any ringer may be selected under the user list and then a second click by a bell will assign
					that user to a bell. Clicking the "x" by the user's name will kick them off that bell. Bells may not be rung
					in bell assignment mode. Simply click the button in the control towers to exit bell assignment mode.
					For now, anyone may assign anyone (and kick off anyone).</p>
			
					<p>There are also hot-keys for various calls, but be aware that in some browsers using these results
							in the sound of the bells being interrupted.</p>
					<ul>
						<li><b>[l]</b>ook to...</li>
						<li><b>[g]</b>o next time</li>
						<li><b>[b]</b>ob</li>
						<li>si<b>[n]</b>gle</li>
						<li>t<b>[h]</b>at's all</li>
						<li>s<b>[t]</b>and next</li>
					</ul>
				</div>
			</div>
               `,
}); // End help

// user_display holds functionality required for users
Vue.component('user_display', {

    // data in components should be a function, to maintain scope
	data: function(){
		return { user_names: [],
                 assignment_mode: false,
                 selected_user: '',
                 cur_user: '',
                 observers: 0,
        } },

    methods: {

        toggle_assignment: function(){
            this.assignment_mode = !this.assignment_mode;
            if (this.assignment_mode){
                this.selected_user = this.cur_user;
            } else {
                this.rotate_to_assignment();
            }
        },

        rotate_to_assignment: function(){
            console.log('rotating to assignment')
            // Don't rotate while assigning bells
            if (this.assignment_mode){ return };

            // Don't rotate if the user has no name yet
            if (!this.cur_user){ return };

            var cur_user_bells = []
            this.$root.$refs.bells.forEach((bell,index) =>
                {if (bell.assigned_user === this.cur_user){
                    cur_user_bells.push(index+1);
                } 
            });
            console.log(cur_user_bells);
            // the user has no bells; don't screw with rotation
            if (cur_user_bells === []){
                console.log('skipping — no assigned bells');
                return;
            };
            const rotate_to = Math.min(...cur_user_bells);
            this.$root.rotate(rotate_to);
        },


        select_user: function(user){
            this.selected_user = user;
        },

        add_user: function(user){
            if (user === this.cur_user){
                this.user_names.unshift(user);
            } else {
                this.user_names.push(user);
            }
        },

        remove_user: function(user){
            console.log('removing user: ' + user);
            const index = this.user_names.indexOf(user);
            if (index > -1) {
              this.user_names.splice(index, 1);
            }
        },

    },

	template: 
    `
         <div>
         <div class="row">

         <div class="col">
         <ul class="list-group">
            <li class="list-group-item">
                <h2 class="align-baseline" style="display: inline;">Users</h2>
                <span class="float-right align-text-bottom">
                <button class="btn btn-outline-primary"
                        :class="{active: assignment_mode}"
                        @click="toggle_assignment"
                        >
                   [[ assignment_mode ? 'Stop assigning' : 'Assign bells' ]]
                 </button>
                 </span>
            </li>
            <li v-for="user in user_names"
                class="list-group-item list-group-item-action"
                 :class="{cur_user: user == cur_user,
                          disabled: !assignment_mode,
                          assignment_active: assignment_mode,
                          active: user == selected_user && assignment_mode}"
                 @click="select_user(user)"
             >
                        [[ user ]]
             </li>
                    <li class="observers"
                        v-if="observers != 0">
                        Listeners: [[ observers ]]
                    </li>
                 </ul>
        </div></div>
        </div>
    `,
}); // End user_display




Vue.component("user_name_input", {


    data: function(){ 
            return { input: "",
                     final_name: "",
                     user_name_taken: true,
                     button_disabled: true,
                     logged_in: false,
user_message: "Please input a username. Must be unique and between 1 and 12 characters. " +
"This username is NOT permanent; you will make a new (transient) username periodically.",

def_user_message: "Please input a username. Must be unique and between 1 and 12 characters. " +
"This username is NOT permanent; you will make a new (transient) username periodically.",
        } },

    methods: {

		check_user_name: function(){
			console.log('checking username, length is: ' + this.input.length);

			if (this.input.length > 0 && this.input.length < 13) {
				console.log('checking for name');
				if(this.$root.$refs.users.user_names.includes(this.input)) {
					// not a valid user name
					this.button_disabled = true;
					this.user_name_taken = true;
					this.user_message = "This user name is already taken.";
				} else {
					this.button_disabled = false;
					this.user_name_taken = false;
					this.user_message = this.def_user_message;
				}
			} else {
                // not a valid user name
				this.button_disabled = true;
				this.user_name_taken = true;
				this.user_message = this.def_user_message;
			}
		},

		send_user_name: function() {
			console.log("Sending username")
            this.final_name = this.input;
			console.log(this.final_name)
            this.$root.$refs.users.cur_user = this.final_name;
			socketio.emit('c_user_entered', {user_name: this.final_name, tower_id: cur_tower_id});
			this.$root.logged_in = true;
		},

    },

    mounted: function() {
        this.$refs.username_input.focus()
    },

    template: `
              <form class="un_input_form"
			  	    v-on:submit.prevent="send_user_name"
                    >
                  <fieldset>
                      <input class="un_input_box"
                             type="text" 
                             placeholder="username" 
                             v-model="input" 
                             v-on:input="check_user_name"
                             ref="username_input"
                             required
                             >
                      <button type="submit"
                      		  :disabled="button_disabled"
                              class="un_input_button btn btn-outline-primary"
                              >
                          Join
                      </button>
                  </fieldset>
                  <div id="username-message"> 
                      [[ user_message ]]
                  </div>
			  </form>
              `

});


// The master Vue application
bell_circle = new Vue({

	el: "#bell_circle",

	data: {
		number_of_bells: 0,
		bells: [],
        audio: tower,
        call_throttled: false,
        logged_in: false,
        tower_name: '',
        tower_id: 0,
        hidden_sidebar: true,

	},


	watch: {
        // Change the list of bells to track the current number
		number_of_bells: function(new_count){
            console.log('changing number of bells to ' + new_count)
			const new_bells = [];
			for (var i=1; i <= new_count; i++){
                console.log('pushing bell: ' + i);
				new_bells.push({number: i, position: i});
                console.log(new_bells);
			}
            console.log(new_bells);
			this.bells = new_bells;
            // Request the global state from the server
            socketio.emit('c_request_global_state', {tower_id: cur_tower_id});
		},

		logged_in: function(inf) {
			console.log('turning on keypress listening')

            // Do a special thing to prevent space from pressing focused buttons
            window.addEventListener('keyup', (e) => {
                if (e.which == 32) {
                    e.preventDefault();
                }
            });

            $('[data-toggle="tooltip"]').tooltip();

			window.addEventListener('keydown', (e) => {
			e = e || window.event;
			const key = e.key // this wil be the character generated by the keypress
			// Shift+1 produces code "Digit1"; this gets the digit itself
			const code = e.code[e.code.length - 1]

            // Do a special thing to prevent space from focusing buttons
            if (e.which == 32) {
                e.preventDefault();
            }

			// The numberkeys 1-0 ring those bells, with -, = ringing E, T
			if (parseInt(key)-1 in [...Array(9).keys()]){
				bell_circle.pull_rope(parseInt(key));
			} else if (parseInt(key) == 0){
				bell_circle.pull_rope(10);
			} else if (['-'].includes(key)){
				bell_circle.pull_rope(11);
			} else if (['='].includes(key)) {
				bell_circle.pull_rope(12);
			}

			// Shift+numkey rotates the circle so that that bell is in position 4
			// This is done in a slightly roundabout way to work on both US & UK keyboards
			if (e.shiftKey) {
				console.log(key);
				if (parseInt(code)-1 in [...Array(9).keys()]){
					bell_circle.rotate(parseInt(code));
				} else if (parseInt(code) == 0){
						bell_circle.rotate(10);
				} else if (['_'].includes(key)){
					bell_circle.rotate(11);
				} else if (['+'].includes(key)) {
					bell_circle.rotate(12);
				}
			}


			const n_b = bell_circle.number_of_bells;
			// Space, j, and ArrowRight ring the bell in position n/2
			if ([' ','j','ArrowRight'].includes(key)){
				bell_circle.pull_rope_by_pos(1);
			}

			// f and ArrowLeft ring the bell in position n/2 + 1
			if (['f','ArrowLeft'].includes(key)){
				bell_circle.pull_rope_by_pos(2);
			}

			// Calls are: g = go; h = stop; b = bob; n = single.
			if (['b'].includes(key)){
				console.log('calling bob');
				bell_circle.make_call('Bob');
			}
			if (['n'].includes(key)){
				console.log('calling single');
				bell_circle.make_call('Single');
			}

			if(['g'].includes(key)){
				console.log('calling go');
				bell_circle.make_call('Go');
			}

			if (['h'].includes(key)){
				console.log('calling stop');
				bell_circle.make_call("That's all");
			}

			if (['t'].includes(key)){
				console.log('calling stand');
				bell_circle.make_call("Stand next");
			}

			if (['l'].includes(key)){
				console.log('calling look-to');
				bell_circle.make_call("Look to");
			}
		});
		}
	},

	methods: {

      
      // the server rang a bell; find the correct one and ring it
	  ring_bell: function(bell) {
		console.log("Ringing the " + bell)
		this.$refs.bells[bell-1].ring()
	  },

    
      // Trigger a specific bell to emit a ringing event
	  pull_rope: function(bell) {
		console.log("Pulling the " + bell)
		this.$refs.bells[bell-1].emit_ringing_event()
	  },
	
      // Like ring_bell, but calculated by the position in the circle (respecting rotation)
	  ring_bell_by_pos: function(pos){
			for (bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.ring_bell(this.bells[bell]['number']);
					return true;
					}
				}
		},

      // Like pull_rope, but calculated by the position in the circle (respecting rotation)
	  pull_rope_by_pos: function(pos){
			for (var bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.pull_rope(this.bells[bell]['number']);
					return true;
					}
				}
		},

      // emit a call
	  make_call: function(call){
        if (this.call_throttled){ return };
        socketio.emit('c_call',{call: call,tower_id: cur_tower_id});
        this.call_throttled = true;
        setTimeout(()=>{this.call_throttled = false}, 1000);
	  },
	
      // rotate the view of the circle
	  rotate: function(newposs){
		  if (newposs > this.number_of_bells) {
              // the user tried to rotate to a bell that doesn't exist
			  return false;
		  }

          // how many positions to rotate?
		  var offset = this.number_of_bells - newposs;
		  var oldposs = 0;
		  var n_b = this.number_of_bells

		  for (var bell in this.bells){
              // change the position of each bell
			  var number = this.bells[bell]['number'];
			  this.bells[bell]['position'] = (number + offset)%n_b + 1;
		  };

          // We need the Vue's list to be sorted by position
		  this.bells = this.bells.sort(
			  function(a,b){
				  return a['position'] - b['position'];
			  });

	  },

      toggle_controls: function() {
          this.hidden_sidebar = !this.hidden_sidebar;
      },

      copy_id: function() {

          setTimeout(() => {$('#id_clipboard_tooltip').tooltip('hide')},1000);
              var dummy = document.createElement("textarea");
              document.body.appendChild(dummy);
              dummy.value = cur_tower_id;
              dummy.select();
              document.execCommand("copy");
              document.body.removeChild(dummy);
      }

	},

	template: 
    `
        <div>

        <user_name_input ref="un_input"
                         v-show="!logged_in"></user_name_input>

        <div class="row flex-lg-nowrap"
             v-show="logged_in">
        
        <div class="col-12 col-lg-4 sidebar_col"> <!-- sidebar col -->

        <div class="tower_header">
        <div class="row">
             <div class="col">
                 <h1 id="tower_name"> [[ tower_name ]] </h1>
             </div>
         </div>

         <div class="row">
             <div class="col">
                 <div class="row justify-content-between">
                     <div class="col-auto">

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
                     <div class="col-auto">
                         <help ref="help"></help>
                     </div>
                     <div class="col-auto toggle_controls d-lg-none">
                         <button class="toggle_controls btn btn-outline-primary" 
                                 data-toggle="collapse"
                                 data-target="#tower_controls"
                                 @click="toggle_controls"
                                >
                         Controls [[ hidden_sidebar ? '▸' : '▾' ]]
                         </button>
                     </div>
                 </div>
            </div>
        </div>
        </div> <!-- tower header -->

        <div class="tower_controls collapse"
             id="tower_controls"
             >


        <tower_controls ref="controls"></tower_controls>


        <user_display ref="users"></user_display>


        </div> <!-- hidden sidebar -->

        </div> <!-- sidebar col -->


        <div class="col-12 col-lg-8 bell_circle_col"> <!-- bell circle col -->

        <div class="bell_circle"
             v-bind:class="[number_of_bells == 4 ? 'four'    : '',
                            number_of_bells == 6  ? 'six'    : '',
                            number_of_bells == 8  ? 'eight'  : '',
                            number_of_bells == 10 ? 'ten'    : '',
                            number_of_bells == 12 ? 'twelve' : '']">
            <call_display v-bind:audio="audio" ref="display"></call_display>
              <bell_rope v-for="bell in bells"
                         v-bind:key="bell.number"
                         v-bind:number="bell.number"
                         v-bind:position="bell.position"
                         v-bind:number_of_bells="number_of_bells"
                         v-bind:audio="audio"
                         v-bind:id="bell.number"
                         ref="bells"
                         ></bell_rope>
        </div> <!-- bell_circle -->
        </div> <!-- row -->

        </div>
    `

}); // end Vue bell_circle

}); // end document.ready


////////////////////////
/* Chat functionality */
////////////////////////
// This was temporary for testing room functionality when we first added it. 
// It may be useful later.

// var tower_selector = new Vue({

// 	delimiters: ['[[',']]'], // don't interfere with flask

// 	el: "#message-sender",

// 	data: {
// 		cur_username: '',
// 		cur_message: '',
// 		tower_selected: '',
// 	},

// 	methods: {

// 		submit_message: function(un,msg){
// 			console.log('sending message: ' + un + msg);
// 			socketio.emit('message_sent', { user_name : un, 
// 											message : msg,
// 											tower : cur_tower_id})
// 		},

// 		enter_tower: function(){
// 			if (cur_tower_id) {
// 				console.log('leaving tower: ' + cur_tower_id);
// 				socketio.emit('leave',{username: this.cur_username, tower: cur_tower_id});
// 			};
// 			console.log('entering tower: ' + this.tower_selected);
// 			socketio.emit('join', {username: this.cur_username, tower: this.tower_selected});
// 			cur_tower_id = this.tower_selected;
// 		}

// 	},

// 	template: `
// 	<form v-on:submit.prevent="submit_message(cur_username,cur_message)">
// 		<select v-model="tower_selected" v-on:change="enter_tower">
// 		  <option disabled value="">Please select a tower</option>
// 		  <option>Advent</option>
// 		  <option>Old North</option>
// 		</select>
// 		<input v-model="cur_username" placeholder="User Name"/>
// 		<input v-model="cur_message" placeholder="Message"/>
// 		<input type="submit"/>
// 	</form>

// 	`

// });

// var message_display = new Vue({
// 	delimiters: ['[[',']]'], // don't interfere with flask

// 	el: "#message-container",

// 	data : {messages: []},

// 	template: `<div v-html='messages.join("<br/>")'></div>`


// });


/* Listeners for chat function */

// socketio.on('message_received',function(msg){
// 	console.log(msg)
// 	message_display.messages.push('<b>' + msg.user_name + '</b>: ' + msg.message)
// });


