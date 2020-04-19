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
// logger.disableLogger()

// Set up socketio instance
var socketio = io()

// Get the current tower_id and let the server know where we are
var cur_path = window.location.pathname.split('/')
var cur_tower_id = parseInt(cur_path[1])
socketio.emit('c_join_observer',{tower_id: cur_tower_id})

// set up disconnection at beforeunload
window.addEventListener("beforeunload", function (e) {
    socketio.emit('c_user_left',
          {user_name: bell_circle.$refs.users.cur_user, 
          tower_id: cur_tower_id,
          observer: true});
});

////////////////////////
/* SOCKETIO LISTENERS */
////////////////////////

// A bell was rung
socketio.on('s_bell_rung', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	// if(msg.disagree) {}
	bell_circle.ring_bell(msg.who_rang);
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
								"⑦", "⑧", "⑨", "⑩", "⑪ ","⑫"],
			   images: ["handstroke", "backstroke"],
               assigned_user: '',
	  };
	},

    computed: {

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

    },

	template:`
            <div class="bell"
                 :class="{left_side: left_side}">
                <div class="col-xs-12">
                <div class="row"
                    :class="[left_side ? 'reverse' :  '',
                             top_side ? 'top-xs' : 'bottom-xs']">
                    <div class="col-xs-3">
                     <img class="bell_img" 
                          :class='{assignment_mode: assignment_mode}'
                          :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"
                          />
                    </div>
                    <div class="col-xs-9 bell_metadata">
                    <div class="row left-xs-12"
                         :class="{reverse: top_side}">

                        <div class="col-xs-12"
                             v-show="top_side">
                        <span class='number' 
                             :class="[number == 1 ? 'treble' : '',
                                      assigned_user == cur_user ? 'cur_user' : '']"
                              >

                         [[ circled_digits[number-1] ]]

                        </span>
                        </div>

                        <div class="col-xs-12">
                            <div class="row">
                            <div class="col-xs assign"> 
                        [[ (assignment_mode) ? ((assigned_user) ? assigned_user : '(assign ringer)')
                                                 : assigned_user ]]
                             </div>
                             <div class="col-xs unassign"
                                  v-if="assignment_mode && 
                                         assigned_user"
                                   > 🆇
                            </div>
                            </div>
                        </div>


                        <div class="col-xs-12"
                             v-show="!top_side">
                        <span class='number' 
                             :class="[number == 1 ? 'treble' : '',
                                      assigned_user == cur_user ? 'cur_user' : '']"
                              >

                         [[ circled_digits[number-1] ]]

                        </span>
                        </div>

                    </div>
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
				>
                       <button> Help [[ help_showing ? '▾' : '▸' ]] </button>
                </div>
                <div v-if="help_showing"
                class="help_showing"
                >
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
					in bell assignment mode. Simply click the button in the control towers to exist bell assignment mode.
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
         <div class="row">
             <div class="col-xs-12">
                 <h3>Users</h3></div>
         
         <div class="col-xs">
                 <ul class="user_list">
                     <li v-for="user in user_names"
                         :class="{cur_user: user == cur_user,
                                  assignment_active: assignment_mode,
                                  selected_user: user == selected_user}"
                     >
                         [[ user ]]
                     </li>
                    <li class="observers"
                        v-show="observers != 0">
                        Listeners: [[ observers ]]
                    </li>
                 </ul>
        </div></div>
        </div>
    `,
}); // End user_display




// The master Vue application
bell_circle = new Vue({

	el: "#bell_circle",

	data: {
		number_of_bells: 0,
		bells: [],
        audio: tower,
        call_throttled: false,
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
	},

	methods: {

      
      // the server rang a bell; find the correct one and ring it
	  ring_bell: function(bell) {
		console.log("Ringing the " + bell)
		this.$refs.bells[bell-1].ring()
	  },

      toggle_controls: function() {
          this.hidden_sidebar = !this.hidden_sidebar;
      },
	},

	template: 
    `
        <div>

        <div class="row">
        
        <div class="col-xs-12 col-lg-4 maxed_col sidebar_col"> <!-- sidebar col -->

        <div class="tower_header">
        <div class="row">
             <div class="col-xs">
                 <h1 id="tower_name"> [[ tower_name ]] </h1>
             </div>
         </div>

         <div class="row">
             <div class="col-xs">
                 <div class="row between-xs">
                     <div class="col-xs-4 col-md-6"><span class="tower_id">ID: [[tower_id]]</div>
                     <div class="col-xs-4 toggle_controls end-xs">
                         <button class="toggle_controls" @click="toggle_controls">
                         Show ringers [[ hidden_sidebar ? '▸' : '▾' ]]
                         </button>
                     </div>
                 </div>
            </div>
        </div>
        </div> <!-- tower header -->

        <div class="tower_controls"
             :class="{collapsed: hidden_sidebar}">

        <div class="row"><div class="col-xs"><hr/></div></div>

        <user_display ref="users"></user_display>

        <div class="row final_hr"><div class="col-xs"><hr/></div></div>

        </div> <!-- hidden sidebar -->

        </div> <!-- sidebar col -->


        <div class="col-xs-12 col-sm-8"> <!-- bell circle col -->

        <call_display v-bind:audio="audio" ref="display"></call_display>

        <div class="bell_circle"
             v-bind:class="[number_of_bells == 4 ? 'four'    : '',
                            number_of_bells == 6  ? 'six'    : '',
                            number_of_bells == 8  ? 'eight'  : '',
                            number_of_bells == 10 ? 'ten'    : '',
                            number_of_bells == 12 ? 'twelve' : '']">
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


