window.onload = function() {

/* SOCKET */

	// for development
var socketio = io()


	// for server
// var socketio = io.connect('ringingroom.com',{secure:true, transports:['websocket']});


/* Listen for ringing events */

socketio.on('ringing_event', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	bell_circle.ring_bell(msg.who_rang);
});


socketio.on('global_state',function(msg,cb){
	console.log('Setting global state: ' + msg.global_bell_state);
	gstate = msg.global_bell_state;
	for (i = 0; i < gstate.length; i++){
		bell_circle.$refs.bells[i].set_state_silently(gstate[i]);
	};
});

/* Keeping track of rooms */


var cur_path = window.location.pathname.split('/')
var cur_room = cur_path[1]
socketio.emit('join',{tower_code: cur_room})

socketio.on('tower_name_change',function(msg,cb){
	console.log('Received name change: ' + msg.new_name);
	bell_circle.$refs.controls.tower_name = msg.new_name;
});

socketio.on('call_received',function(msg,cb){
	console.log('Received call: ' + msg.call);
	bell_circle.$refs.display.make_call(msg.call);
});


socketio.on('size_change_event', function(msg,cb){
	new_size = msg.size;
	console.log('changing size to: ' + new_size);
	bell_circle.number_of_bells = new_size;

});

/* AUDIO */

const sounds = new Howl(
{
  "src": [
    "static/audio/sounds.ogg",
    "static/audio/sounds.m4a",
    "static/audio/sounds.mp3",
    "static/audio/sounds.ac3"
  ],
  "sprite": {
    "0": [
      0,
      2503.9909297052154
    ],
    "1": [
      4000,
      2507.392290249433
    ],
    "2": [
      8000,
      2496.893424036282
    ],
    "2sharp": [
      12000,
      2515.238095238095
    ],
    "3": [
      16000,
      2507.1882086167816
    ],
    "4": [
      20000,
      2509.863945578232
    ],
    "5": [
      24000,
      2505.283446712017
    ],
    "6": [
      28000,
      2518.0498866213165
    ],
    "7": [
      32000,
      2511.1337868480705
    ],
    "8": [
      36000,
      2508.5034013605423
    ],
    "9": [
      40000,
      2506.2811791383197
    ],
    "E": [
      44000,
      2509.092970521543
    ],
    "T": [
      48000,
      2510.3174603174593
    ],
    "That's all": [
      52000,
      809.7959183673495
    ],
    "Bob": [
      54000,
      705.3061224489809
    ],
    "Go": [
      56000,
      1201.6326530612246
    ],
    "Single": [
      59000,
      757.5510204081652
    ]
  }
}
);


const bell_mappings = {  6: ['3','4','5','6','7','8'],
					     8: ['1','2sharp','3','4','5','6','7','8'],
						10: ['3','4','5','6','7','8','9','0','E','T'],
						12: ['1','2','3','4','5','6','7','8','9','0','E','T']
					  }

/* RING BY KEYBOARD */

document.onkeydown = function (e) {
    e = e || window.event;
	key = e.key


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

	change_keys = ['!','@','#','$','%','^','&','*','(',')','_','+']
	// Shift+numkey rotates the circle so that that bell is in position 4
	if (change_keys.includes(key)){
		bell_circle.rotate(change_keys.indexOf(key) + 1);
	}

	// Space, j, and ArrowRight ring the bell in position n/2
	if ([' ','j','ArrowRight'].includes(key)){
		n_b = bell_circle.number_of_bells;
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

};

/* BELLS */

// First, set up the bell class
// number — what bell
// poss — where in the tower (the css class)
// stroke — boolean — is the bell currently at hand?
// ring() — toggle the stroke, then 



Vue.component("bell-rope", {

	delimiters: ['[[',']]'], // don't interfere with flask

	props: ["number", "position", "no_of_bells"],

	data: function() {
	  return { stroke: true,
			   circled_digits: ["①", "②", "③", "④", "⑤", "⑥", 
								"⑦", "⑧", "⑨", "⑩", "⑪ ","⑫"],
			   images: ["handstroke", "backstroke"]
	  };
	},

	methods: {

	  pull_rope: function() {
		socketio.emit('pulling_event',
				{bell: this.number, stroke: this.stroke, tower_code: cur_room});
		// this.stroke = !this.stroke;
		report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

	  ring: function(){
		this.stroke = !this.stroke;
		sounds.play(bell_mappings[this.no_of_bells][this.number - 1]);
		report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	
	  set_state_silently: function(new_state){
		  console.log('Bell ' + this.number + ' set to ' + new_state)
		  this.stroke = new_state
	  }
	},

	template:`
	  <div class='rope'>

	  <img v-if="position <= no_of_bells/2"
		   @click='pull_rope'
		   class="rope-img" 
		   :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"/>

	  <div class='number' v-bind:class="[position > no_of_bells/2 ? 'left_number' : '', 
										 number == 1 ? 'treble' : '']">

	  [[ circled_digits[number-1] ]]

	  </div>

	  <img v-if="position > no_of_bells/2"
		   @click='pull_rope'
		   class="rope-img" 
		   :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"/>

	  </div>
		   `

});


Vue.component('call-display', {

	delimiters: ['[[',']]'], // don't interfere with flask

	data: function(){
		return { cur_call: '' };
	},

	methods: {

		make_call: function(call){
			console.log('changing cur_call to: ' + call);
			this.cur_call = call;
			sounds.play(call);
			var self = this;
			setTimeout(function() { self.cur_call = ''; 
						console.log('changing cur_call back');}, 2000);
		}
	},

	template: "<h2 id='call-display' ref='display'>[[ cur_call ]]</h2>"
});


Vue.component('tower-controls', {

	delimiters: ['[[',']]'], // don't interfere with flask

	data: function(){ 
		return {tower_sizes: [6,8,10,12],
				buttons: { 6: "⑥",
						   8: "⑧",
						  10: "⑩",
						  12: "⑫"},
				tower_name: ''} },

	methods: {
		set_tower_size: function(size){
			console.log('setting tower size to ' + size);
			socketio.emit('request_size_change',{new_size: size, room: cur_room});
		},
	},

	template: `<div>
				<h2 class="tower-name">[[ tower_name ]] </h2>
				<ul class = "tower-control"> 
				<li 
					v-for="size in tower_sizes"
					v-bind:size="size"
					@click="set_tower_size(size)">
					[[ buttons[size] ]]
				</li> 
			   </ul>
			   </div>`,




});


// The master view
// ring_bell: Ring a specific bell

var bell_circle = new Vue({

	delimiters: ['[[',']]'], // don't interfere with flask

	el: "#ringing-circle",

	data: {

		number_of_bells: 8,
		bells: []

	},

	watch: {
		number_of_bells: function(new_count, old_count){
			list = [];
			for (i=1; i <= new_count; i++){
				list.push({number: i, position: i});
			}
			this.bells = list;
		}
	},

	created: function() {
		list = [];
		for (i=1; i <= this.number_of_bells; i++){
			list.push({number: i, position: i});
		}
		this.bells = list;
	},

	methods: {
	  ring_bell: function(bell) {
		console.log("Ringing the " + bell)
		this.$refs.bells[bell-1].ring()
	  },

	  pull_rope: function(bell) {
		console.log("Pulling the " + bell)
		this.$refs.bells[bell-1].pull_rope()
	  },
	
	  make_call: function(call){
		  socketio.emit('call_made',{call: call});
	  },
	
	  rotate: function(newposs){
		  if (newposs > this.number_of_bells) {
			  return false;
		  }
		  offset = this.number_of_bells - newposs;
		  var oldposs = 0;
		  n_b = this.number_of_bells

		  for (bell in this.bells){
			  number = this.bells[bell]['number'];
			  this.bells[bell]['position'] = (number + offset + (n_b/2)-1)%n_b + 1;
		  };

		  this.bells = this.bells.sort(
			  function(a,b){
				  return a['position'] - b['position'];
			  });
	  },

	  ring_bell_by_pos: function(pos){
			for (bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.ring_bell(this.bells[bell]['number']);
					return true;
					}
				}
		},

	  pull_rope_by_pos: function(pos){
			for (bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.pull_rope(this.bells[bell]['number']);
					return true;
					}
				}
		},
	},

	template: `
	<div>
	<tower-controls ref="controls"></tower-controls>
	<call-display ref="display"></call-display>
    <div id="bell-circle"
		 v-bind:class="[ number_of_bells == 6  ? 'six'    : '',
						 number_of_bells == 8  ? 'eight'  : '',
						 number_of_bells == 10 ? 'ten'    : '',
						 number_of_bells == 12 ? 'twelve' : '']">

        <bell-rope
          v-for="bell in bells"
          v-bind:key="bell.number"
          v-bind:number="bell.number"
		  v-bind:position="bell.position"
		  v-bind:no_of_bells="number_of_bells"
		  v-bind:id="bell.number"
          ref="bells"
          ></bell-rope>

    </div>
	</div>
	`

});

// var room_selector = new Vue({

// 	delimiters: ['[[',']]'], // don't interfere with flask

// 	el: "#message-sender",

// 	data: {
// 		cur_username: '',
// 		cur_message: '',
// 		room_selected: '',
// 	},

// 	methods: {

// 		submit_message: function(un,msg){
// 			console.log('sending message: ' + un + msg);
// 			socketio.emit('message_sent', { user_name : un, 
// 											message : msg,
// 											room : cur_room})
// 		},

// 		enter_room: function(){
// 			if (cur_room) {
// 				console.log('leaving room: ' + cur_room);
// 				socketio.emit('leave',{username: this.cur_username, room: cur_room});
// 			};
// 			console.log('entering room: ' + this.room_selected);
// 			socketio.emit('join', {username: this.cur_username, room: this.room_selected});
// 			cur_room = this.room_selected;
// 		}

// 	},

// 	template: `
// 	<form v-on:submit.prevent="submit_message(cur_username,cur_message)">
// 		<select v-model="room_selected" v-on:change="enter_room">
// 		  <option disabled value="">Please select a room</option>
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


};

