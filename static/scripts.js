window.onload = function() {

/* SOCKET */

var socketio = io();

/* Listen for ringing events */

socketio.on('ringing_event', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	bell_circle.ring_bell(msg.who_rang);
});


/* AUDIO */


var sound = new Howl({
  src: ['bells.mp3'],
  sprite: {
    blast: [0, 3000],
    laser: [4000, 1000],
    winner: [6000, 5000]
  }
});


var sound_b1 = new Howl({
  src: ['static/audio/1.mp3']
});

var sound_b2 = new Howl({
  src: ['static/audio/2sharp.mp3']
});

var sound_b3 = new Howl({
  src: ['static/audio/3.mp3']
});

var sound_b4 = new Howl({
  src: ['static/audio/4.mp3']
});

var sound_b5 = new Howl({
  src: ['static/audio/5.mp3']
});

var sound_b6 = new Howl({
  src: ['static/audio/6.mp3']
});

var sound_b7 = new Howl({
  src: ['static/audio/7.mp3']
});

var sound_b8 = new Howl({
  src: ['static/audio/8.mp3']
});

sounds = [ sound_b1, sound_b2, sound_b3, sound_b4, sound_b5, sound_b6, sound_b7, sound_b8]

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
		console.log()
		bell_circle.pull_rope(home_row.indexOf(key) + 1);
	};
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
		sounds[this.number - 1].play()
		report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	},

	template:
	  `<li
		@click='pull_rope'>
	  <span class="bell-number"> [[ circled_digits[number-1] ]] </span>
	  <span class="rope">
		<img :src="'static/images/' + (stroke ? images[0] : images[1]) + '.png'"/></span>
	  </li>`

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
	  }
	},

	template: `
    <ul id="bell-circle">

        <bell-rope
          v-for="bell in bells"
          v-bind:key="bell.number"
          v-bind:number="bell.number"
          ref="bells"
          ></bell-rope>

    </ul>
	`

});

}
