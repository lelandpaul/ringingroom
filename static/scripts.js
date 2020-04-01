window.onload = function() {

/* SOCKET */

	// for development
var socketio = io()


	// for server
// var socketio = io.connect('ringingroom.com',{secure:true, transports:['websocket']});


/* Listen for ringing events */

socketio.on('s_bell_rung', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	bell_circle.ring_bell(msg.who_rang);
});


socketio.on('s_global_state',function(msg,cb){
	console.log('Setting global state: ' + msg.global_bell_state);
	gstate = msg.global_bell_state;
	for (i = 0; i < gstate.length; i++){
		bell_circle.$refs.bells[i].set_state_silently(gstate[i]);
	};
});

/* Keeping track of rooms */


var cur_path = window.location.pathname.split('/')
var cur_room = parseInt(cur_path[1])
socketio.emit('c_join',{tower_id: cur_room})

socketio.on('s_name_change',function(msg,cb){
	console.log('Received name change: ' + msg.new_name);
	bell_circle.$refs.controls.tower_name = msg.new_name;
	bell_circle.$refs.controls.tower_id = parseInt(cur_room);
});

socketio.on('s_call',function(msg,cb){
	console.log('Received call: ' + msg.call);
	bell_circle.$refs.display.make_call(msg.call);
});


socketio.on('s_size_change', function(msg,cb){
	new_size = msg.size;
	console.log('changing size to: ' + new_size);
	bell_circle.number_of_bells = new_size;

});

/* AUDIO */

const tower = new Howl({
  src: [
    "static/audio/tower.ogg",
    "static/audio/tower.m4a",
    "static/audio/tower.mp3",
    "static/audio/tower.ac3"
  ],
  volume: 0.2,
  sprite: {
    "0": [
      0,
      997.7551020408163
    ],
    "1": [
      2000,
      998.6167800453516
    ],
    "2": [
      4000,
      1010.9523809523813
    ],
    "2sharp": [
      7000,
      998.3673469387755
    ],
    "3": [
      9000,
      1000.5442176870752
    ],
    "4": [
      12000,
      997.0294784580495
    ],
    "5": [
      14000,
      1018.4580498866218
    ],
    "6": [
      17000,
      1010.3174603174593
    ],
    "7": [
      20000,
      1007.0975056689342
    ],
    "8": [
      23000,
      1010.9523809523821
    ],
    "9": [
      26000,
      1010.9523809523821
    ],
    "E": [
      29000,
      1003.0385487528335
    ],
    "T": [
      32000,
      1011.247165532879
    ],
    "Bob": [
      35000,
      396.84807256235644
    ],
    "Single": [
      37000,
      582.8798185941012
    ],
    "Go": [
      39000,
      1009.7732426303878
    ],
    "That's all": [
      42000,
      654.6938775510184
    ],
    "Stand next": [
      44000,
      1228.9342403628111
    ]
  }
}
);

const hand = new Howl({
  src: [
    "static/audio/hand.ogg",
    "static/audio/hand.m4a",
    "static/audio/hand.mp3",
    "static/audio/hand.ac3"
  ],
  volume: 0.2,
  sprite: {
    "1": [
      0,
      1519.8866213151928
    ],
    "2sharp": [
      3000,
      1495.3514739229022
    ],
    "3": [
      6000,
      1520.3854875283448
    ],
    "4": [
      9000,
      1519.841269841269
    ],
    "5": [
      12000,
      1495.419501133787
    ],
    "6": [
      15000,
      1507.5736961451262
    ],
    "7": [
      18000,
      1507.7324263038533
    ],
    "8": [
      21000,
      1513.6961451247153
    ],
    "Bob": [
      24000,
      396.84807256236
    ],
    "Single": [
      26000,
      582.8798185941047
    ],
    "Go": [
      28000,
      1009.7732426303843
    ],
    "That's all": [
      31000,
      654.6938775510221
    ],
    "Stand next": [
      33000,
      1228.9342403628111
    ]
  }
}
  
);

const bell_mappings = {  6: ['3','4','5','6','7','8'],
					     8: ['1','2sharp','3','4','5','6','7','8'],
						10: ['3','4','5','6','7','8','9','0','E','T'],
						12: ['1','2','3','4','5','6','7','8','9','0','E','T']
					  }

socketio.on('s_audio_change',function(msg,cb){
  console.log('changing audio to: ' + msg.new_audio);
  bell_circle.$refs.controls.audio_type = msg.new_audio;
  bell_circle.audio = msg.new_audio == 'Tower' ? tower : hand;
  if (msg.new_audio == 'Hand' && bell_circle.number_of_bells > 8){
    socketio.emit('c_size_change',{new_size: 8, tower_id:cur_room});
  }
});


/* RING BY KEYBOARD */

document.onkeydown = function (e) {
    e = e || window.event;
	key = e.key
    // Shift+1 produces code "Digit1"; this gets the digit itself
    code = e.code[e.code.length - 1]

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
    

	// Space, j, and ArrowRight ring the bell in position n/2
	if ([' ','j','ArrowRight'].includes(key)){
		n_b = bell_circle.number_of_bells;
		bell_circle.pull_rope_by_pos(n_b / 2);
	}

	// f and ArrowLeft ring the bell in position n/2 + 1
	if (['f','ArrowLeft'].includes(key)){
		n_b = bell_circle.number_of_bells
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

};

/* BELLS */

// First, set up the bell class
// number — what bell
// poss — where in the tower (the css class)
// stroke — boolean — is the bell currently at hand?
// ring() — toggle the stroke, then 



Vue.component("bell-rope", {

	delimiters: ['[[',']]'], // don't interfere with flask

	props: ["number", "position", "no_of_bells","audio"],

	data: function() {
	  return { stroke: true,
			   circled_digits: ["①", "②", "③", "④", "⑤", "⑥", 
								"⑦", "⑧", "⑨", "⑩", "⑪ ","⑫"],
			   images: ["handstroke", "backstroke"],
	  };
	},

	methods: {

	  pull_rope: function() {
		socketio.emit('c_bell_rung',
				{bell: this.number, stroke: this.stroke, tower_int: cur_room});
		// this.stroke = !this.stroke;
		report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

	  ring: function(){
		this.stroke = !this.stroke;
		this.audio.play(bell_mappings[this.no_of_bells][this.number - 1]);
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

    props: ["audio"],

	delimiters: ['[[',']]'], // don't interfere with flask

	data: function(){
		return { cur_call: '' };
	},

	methods: {

		make_call: function(call){
			console.log('changing cur_call to: ' + call);
			this.cur_call = call;
			this.audio.play(call);
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
				tower_name: '',
				tower_id: 0,
                audio_type: 'Tower'} },

	methods: {
		set_tower_size: function(size){
			console.log('setting tower size to ' + size);
			socketio.emit('c_size_change',{new_size: size, room: cur_room});
		},
        swap_audio: function(){
          console.log('swapping audio');
          socketio.emit('c_audio_change',{old_audio: this.audio_type, tower_id:cur_room})
        },
	},

	template: `<div class = "tower-control">
				<h2 class="tower-name">[[ tower_name ]] 
                    <span class="tower-id">ID: [[tower_id]]</span>
                      </h2>
				<ul class = "tower-control-size"> 
				<li 
					v-for="size in tower_sizes"
					v-bind:size="size"
                    v-show="audio_type == 'Tower' || size <= 8"
					@click="set_tower_size(size)">
					[[ buttons[size] ]]
				</li> 
			   </ul>
               <div class="audio-toggle"
                    @click="swap_audio">Audio: [[ audio_type ]] bell</div>
			   </div>`,
});


// The master view
// ring_bell: Ring a specific bell

var bell_circle = new Vue({

	delimiters: ['[[',']]'], // don't interfere with flask

	el: "#ringing-circle",

	data: {

		number_of_bells: 8,
		bells: [],
        audio: tower,
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
        socketio.emit('c_call',{call: call,tower_id: cur_room});
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
    <call-display v-bind:audio="audio" ref="display"></call-display>
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
          v-bind:audio="audio"
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

