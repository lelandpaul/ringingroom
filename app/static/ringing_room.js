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
var socketio = io() // for development
// var socketio = io.connect('ringingroom.com',{secure:true, transports:['websocket']}); // for server

// Get the current tower_id and let the server know where we are
var cur_path = window.location.pathname.split('/')
var cur_tower_id = parseInt(cur_path[1])
socketio.emit('c_join',{tower_id: cur_tower_id})


////////////////////////
/* SOCKETIO LISTENERS */
////////////////////////

// A bell was rung
socketio.on('s_bell_rung', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	bell_circle.ring_bell(msg.who_rang);
});

// getting initial user state
socketio.on('s_user_change', function(msg, cb){
	console.log('Getting users: ' + msg.users);
	if (msg.users && msg.users.length > 0) {
		bell_circle.$refs.users.user_names = msg.users
	} else {
		bell_circle.$refs.users.user_names = []
	}
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
    bell_circle.number_of_bells = gstate.length
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
  if (msg.new_audio == 'Hand' && bell_circle.number_of_bells > 8){
    socketio.emit('c_size_change',{new_size: 8, tower_id: cur_tower_id});
  }
});


///////////
/* AUDIO */
///////////

import {tower, hand, bell_mappings} from './audio.js';

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
	  };
	},

	methods: {

      
      // emit a ringing event ot the server
	  emit_ringing_event: function() {
		socketio.emit('c_bell_rung',
				{bell: this.number, stroke: this.stroke, tower_id: cur_tower_id});
		var report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

      // Ringing event received; now ring the bell
	  ring: function(){
		this.stroke = !this.stroke;
		this.audio.play(bell_mappings[this.number_of_bells][this.number - 1]);
		var report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	
      // global_state received; set the bell to the correct stroke
	  set_state_silently: function(new_state){
		  console.log('Bell ' + this.number + ' set to ' + new_state)
		  this.stroke = new_state
	  }
	},

	template:`
             <div class='rope'>

                 <img v-if="position <= number_of_bells/2"
                      @click='emit_ringing_event'
                      class="rope_img" 
                      :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"
                      />

                 <div class='number' 
                      v-bind:class="[position > number_of_bells/2 ? 'left_number' : '', 
                                     number == 1 ? 'treble' : '']"
                      >

                 [[ circled_digits[number-1] ]]

                 </div>

                 <img class="rope_img" 
                      v-if="position > number_of_bells/2"
                      @click='emit_ringing_event'
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

	methods: {

        // the user clicked a tower-size button
		set_tower_size: function(size){
			console.log('setting tower size to ' + size);
			socketio.emit('c_size_change',{new_size: size, tower_id: cur_tower_id});
		},

        // the user clicked the audio toggle
        swap_audio: function(){
          console.log('swapping audio');
          socketio.emit('c_audio_change',{old_audio: this.audio_type, tower_id: cur_tower_id})

        },
	},

	template: `
              <div class="tower_control">
                  <h2 class="tower_name">
                      [[ tower_name ]] 
                      <span class="tower_id">ID: [[tower_id]]</span>
                  </h2>
			      <ul class = "tower_control_size"> 
			        <li v-for="size in tower_sizes"
				        v-bind:size="size"
                        v-show="audio_type == 'Tower' || size <= 8"
				        @click="set_tower_size(size)"
                        >
                        [[ buttons[size] ]]
                    </li> 
			      </ul>
                  <div class="audio_toggle"
                       @click="swap_audio"
                       >
                       Audio: [[ audio_type ]] bell
                  </div>
			   </div>
               `,
}); // End tower_controls


// user_display holds functionality required for users
Vue.component('user_display', {

    props: ['user_name'],

    // data in components should be a function, to maintain scope
	data: function(){
		return { user_names: [],
                 assignment_mode: false
        } },


	template: `
              <div class="user_display">
                  <h4 class="user_display_title">
                      Users
                  </h4>
                  <span class="toggle_assign"
                        :class="{active: assignment_mode}"
                        @click="assignment_mode = !assignment_mode">
                        [[ assignment_mode ? 'Stop assigning' : 'Assign bells' ]]
                  </span>
			      <ul class="user_list"> 
			        <li v-for="user in user_names"
                        :class="{cur_user: user == user_name}"
                        >
                        [[ user ]]
                    </li> 
			      </ul>
			   </div>
               `,
}); // End user_display

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
				<div v-if="help_showing === false"
				class="help_toggle"
				@click="show_help"
				>
                       [click for help]
                </div>
                <div v-else
                class="help_showing"
                @click="show_help">
                  	[click to close]
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
					<ul>
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



// The master Vue application
bell_circle = new Vue({

	el: "#bell_circle",

	data: {
		number_of_bells: 8,
		bells: [],
        audio: tower,
		user_name: "",
		user_name_taken: true,
		button_disabled: true,
		user_message: "Please input a username. Must be unique and longer than 0 characters.",
		def_user_message: "Please input a username. Must be unique and longer than 0 characters.",
		logged_in: false
	},


	watch: {
        // Change the list of bells to track the current number
		number_of_bells: function(new_count){
            console.log('changing number of bells to ' + new_count)
			var list = [];
			for (var i=1; i <= new_count; i++){
				list.push({number: i, position: i});
			}
			this.bells = list;
		},

		logged_in: function(inf) {
			console.log('turning on keypress listening')
			window.addEventListener('keydown', (e) => {
			e = e || window.event;
			const key = e.key // this wil be the character generated by the keypress
			// Shift+1 produces code "Digit1"; this gets the digit itself
			const code = e.code[e.code.length - 1]

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
				bell_circle.pull_rope_by_pos(n_b / 2);
			}

			// f and ArrowLeft ring the bell in position n/2 + 1
			if (['f','ArrowLeft'].includes(key)){
				bell_circle.pull_rope_by_pos((n_b / 2) + 1);
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
		});
		}
	},

    // On creation: Create a list of bells
	created: function() {
		var list = [];
		for (var i=1; i <= this.number_of_bells; i++){
			list.push({number: i, position: i});
		}
		this.bells = list;

		window.addEventListener('beforeunload', e => {
			socketio.emit('c_user_change', {user_name: this.user_name, tower_id: cur_tower_id});
			e.preventDefault();
			e.returnValue = ' ';
		});
	},

	methods: {

		check_user_name: function(){
			console.log('checking username, length is: ' + this.user_name.length);

			if (this.user_name.length > 0) {
				console.log('checking for name');
				if(this.$refs.users.user_names.includes(this.user_name)) {
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

		send_user_name: function(inf) {
			console.log("it's a username!")
			console.log(this.user_name)
			socketio.emit('c_user_change', {user_name: this.user_name, tower_id: cur_tower_id});
			this.logged_in = true
		},
      
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
        socketio.emit('c_call',{call: call,tower_id: cur_tower_id});
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
			  this.bells[bell]['position'] = (number + offset + (n_b/2)-1)%n_b + 1;
		  };

          // We need the Vue's list to be sorted by position
		  this.bells = this.bells.sort(
			  function(a,b){
				  return a['position'] - b['position'];
			  });
	  },

	},

	template: `
			<div>
              <div v-show="!logged_in">
              	<form class="pure-form"
					 v-on:submit.prevent="send_user_name"
                     >
                    <fieldset>
                        <input class="pure-input"
                               type="text" 
                               placeholder="username" 
                               v-model="user_name" 
                               v-on:input="check_user_name"
                               required
                               >
                        <button type="submit"
                        		:disabled="button_disabled"
                                class="pure-button pure-button-primary"
                                >
                            Join
                        </button>
                    </fieldset>
                    <div id="username-message"> 
                        [[ user_message ]]
                    </div>
				</form>
			  </div>
              <div v-show="logged_in">
                  <tower_controls ref="controls"></tower_controls>
                  <user_display ref="users" :user_name="user_name"></user_display>
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
                  <help ref="help"></help>
              </div>
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


