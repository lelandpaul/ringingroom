window.onload = function() {

/* SOCKET */

var socketio = io();

/* Listen for ringing events */

socketio.on('ringing_event', function(msg,cb){
	console.log('Received event: ' + msg.bell + msg.stroke);
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

	props: ["number"],

	data: function() {
	  return { stroke: true };
	},

	methods: {

	  pull_rope: function() {
		socketio.emit('pulling-event',
				{bell: this.number, stroke: this.stroke});
		// this.stroke = !this.stroke;
		report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

	  ring: function(){
		this.stroke = !this.stroke;
		report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	},

	template:
	  `<li
		@click='pull_rope'>
	  <span class="bell-number"> [[ number ]] </span>
	  <span class="rope">[[ stroke ? 'H': 'B' ]]</span>
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
