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
socketio.emit('c_join',{tower_id: cur_tower_id, listen: true})


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
	bell_circle.$refs.controls.tower_name = msg.new_name;
	bell_circle.$refs.controls.tower_id = parseInt(cur_tower_id);
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
								"⑦", "⑧", "⑨", "⑩", "⑪ ","⑫"],
			   images: ["handstroke", "backstroke"],
               assigned_user: '',
	  };
	},

    computed: {

        assignment_mode: function(){
            return this.$root.$refs.users.assignment_mode;
        },


        left_side: function(){
            if (this.position == 1) { return false };
            if (this.position <= (this.number_of_bells/2)+1) { return true };
            return false;
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
             <div class='rope'
                  >

                 <img v-if="!left_side"
                      class="rope_img" 
                      :class='{assignment_mode: assignment_mode}'
                      :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"
                      />

                 <div class='rope_metadata'
                      :class="{left_metadata: left_side}">
                 <div class='number' 
                      v-bind:class="[left_side ? 'left_number' : '', 
                                     number == 1 ? 'treble' : '' ]"
                      >

                 [[ circled_digits[number-1] ]]

                 </div>
                 
                 <div class="assigned_user"
                    :class="[!assigned_user ? 'unassigned' : '',
                             !left_side ? 'left_name' : '']"
                    >
                    <span class="unassign"
                          v-if="assignment_mode && 
                                assigned_user &&
                                left_side"
                          > 🆇 </span>
                    <span class="assign"
                          > [[ (assignment_mode) ? ((assigned_user) ? assigned_user : '(assign ringer)')
                                         : assigned_user ]]
                          </span>
                    <span class="unassign"
                          v-if="assignment_mode && 
                                assigned_user &&
                                !left_side"
                          > 🆇 </span>
                 </div>

                 </div>

                 <img class="rope_img" 
                      v-if="left_side"
                      :class='{assignment_mode: assignment_mode}'
                      :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"
                      />

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
				buttons: { 4: "④",
			  			   6: "⑥",
						   8: "⑧",
						  10: "⑩",
						  12: "⑫"},
				tower_name: '',
				tower_id: 0,
                audio_type: 'Tower'} },


	template: `
              <div class="tower_control">
                  <h2 class="tower_name">
                      [[ tower_name ]] 
                  </h2>
                  <span class="tower_id">ID: [[tower_id]]</span>
			   </div>
               `,
}); // End tower_controls



// user_display holds functionality required for users
Vue.component('user_display', {

    // data in components should be a function, to maintain scope
	data: function(){
		return { user_names: [],
        } },

    methods: {

        add_user: function(user){
            this.user_names.push(user);
        },

        remove_user: function(user){
            console.log('removing user: ' + user);
            const index = this.user_names.indexOf(user);
            if (index > -1) {
              this.user_names.splice(index, 1);
            }
        },

    },

	template: `
              <div class="user_display">
                  <h4 class="user_display_title">
                      Users
                  </h4>
			      <ul class="user_list"> 
			        <li v-for="user in user_names" >
                        [[ user ]]
                    </li> 
			      </ul>
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

    
	
      // Like ring_bell, but calculated by the position in the circle (respecting rotation)
	  ring_bell_by_pos: function(pos){
			for (bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.ring_bell(this.bells[bell]['number']);
					return true;
					}
				}
		},

	},

	template: `
			<div>

                  <tower_controls ref="controls"></tower_controls>
                  <user_display ref="users"></user_display>
                  <call_display v-bind:audio="audio" ref="display"></call_display>
                  <div id="bell_circle"
                       v-bind:class="[ 
                       				   number_of_bells == 4 ? 'four'    : '',
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


