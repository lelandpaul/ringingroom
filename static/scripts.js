window.onload = function() {

/* SOCKET */

var socketio = io()

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


/* AUDIO */

const bells_sprite = new Howl(
{
  "src": [
    "static/audio/bells.ogg",
    "static/audio/bells.m4a",
    "static/audio/bells.mp3",
    "static/audio/bells.ac3"
  ],
  "sprite": {
    "0": [
      0,
      5929.7959183673465
    ],
    "1": [
      7000,
      6008.163265306123
    ],
    "2": [
      15000,
      6008.163265306123
    ],
    "3": [
      30000,
      4780.408163265307
    ],
    "4": [
      36000,
      5877.551020408163
    ],
    "5": [
      43000,
      5955.918367346939
    ],
    "6": [
      50000,
      5955.918367346939
    ],
    "7": [
      57000,
      6034.285714285716
    ],
    "8": [
      65000,
      6008.163265306123
    ],
    "9": [
      73000,
      6008.163265306123
    ],
    "2sharp": [
      23000,
      5982.040816326531
    ],
    "E": [
      81000,
      6008.163265306123
    ],
    "T": [
      89000,
      6008.163265306123
    ]
  }
}
);



const bells_mapping = ['1','2sharp','3','4','5','6','7','8']

/* RING BY KEYBOARD */

document.onkeypress = function (e) {
    e = e || window.event;
	key = String.fromCharCode(e.keyCode);
    console.log(key);
	home_row = ['a','s','d','f','j','k','l',';'];

	if (parseInt(key-1) in [...Array(8).keys()]){
		bell_circle.pull_rope(parseInt(key));
	};

	if (home_row.includes(key)){
		bell_circle.pull_rope(home_row.indexOf(key) + 1);
	};

	if (['b'].includes(key)){
		console.log('calling bob');
		bell_circle.make_call('Bob');

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

	props: ["number"],

	data: function() {
	  return { stroke: true,
			   circled_digits: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧" ],
			   images: ["handstroke", "backstroke"]
	  };
	},

	methods: {

	  pull_rope: function() {
		socketio.emit('pulling_event',
				{bell: this.number, stroke: this.stroke});
		// this.stroke = !this.stroke;
		report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

	  ring: function(){
		this.stroke = !this.stroke;
		bells_sprite.play(bells_mapping[this.number - 1]);
		report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	
	  set_state_silently: function(new_state){
		  console.log('Bell ' + this.number + ' set to ' + new_state)
		  this.stroke = new_state
	  }
	},

	template:
	  `<li
		@click='pull_rope'>
	  <span class="bell-number"> [[ circled_digits[number-1] ]] </span>
	  <span class="rope">
		<img :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"/></span>
	  </li>`

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
			var self = this;
			setTimeout(function() { self.cur_call = ''; 
						console.log('changing cur_call back');}, 2000);
		}
	},

	template: "<h2 id='call-display'>[[ cur_call ]]</h2>"
});


// The master view
// ring_bell: Ring a specific bell

var bell_circle = new Vue({

	delimiters: ['[[',']]'], // don't interfere with flask

	el: "#ringing-circle",

	data: {

	bells: [ // for now: define bells manually
		{ number: 1 },
		{ number: 2 },
		{ number: 3 },
		{ number: 4 },
		{ number: 5 },
		{ number: 6 },
		{ number: 7 },
		{ number: 8 }
	  ]

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
		  this.$refs.display.make_call(call);
	  },
	},

	template: `
	<div>
	<call-display ref="display"></call-display>
    <ul id="bell-circle">

        <bell-rope
          v-for="bell in bells"
          v-bind:key="bell.number"
          v-bind:number="bell.number"
          ref="bells"
          ></bell-rope>

    </ul>
	</div>
	`

});

}

