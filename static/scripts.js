
/* SOCKET */

var socket = io();

/* Listen for ringing events */

socket.on('ringing_event', function(msg,cb){
	console.log('Received event: ' + msg);
	bell_circle.ring_bell(msg.bell);
});



/* BELLS */

// First, set up the bell class
// number — what bell
// poss — where in the tower (the css class)
// stroke — boolean — is the bell currently at hand?
// ring() — toggle the stroke, then 

Vue.component("bell-rope", {

	delimiters: ['[[',']]'], // don't interfere with flask

	props: ["number", "pos"],

	data: function() {
	  return { stroke: true };
	},

	methods: {
	  ring: function() {
		this.stroke = !this.stroke;
		sock
		console.log("Bell " + this.number + " rang a " + stroke ? "backstroke":"handstroke"
	  },
	},

	template:
	  `<h3
		:class='pos' 
		@click='ring'>
	  [[ number ]] - [[ stroke ? 'H': 'B' ]]
	  </h3>`

});

// The master view
// ring_bell: Ring a specific bell

var bell_circle = new Vue({

	delimiters: ['[[',']]'], // don't interfere with flask

	el: "#bell-circle",

	data: {

	bells: [ // for now: define bells manually
		{ number: 1, pos: "deg0" },
		{ number: 2, pos: "deg45" },
		{ number: 3, pos: "deg90" },
		{ number: 4, pos: "deg135" }
		{ number: 5, pos: "deg180" },
		{ number: 6, pos: "deg225" },
		{ number: 7, pos: "deg270" },
		{ number: 8, pos: "deg315" }
	  ]

	},

	methods: {
	  ring_bell: function(bell) {
		console.log("Ringing the " + bell)
		this.$refs.bells[bell-1].ring()
	  }
	},

});

