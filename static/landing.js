window.onload = function() {

/* SOCKET */

	// for development
var socketio = io()


	// for server
// var socketio = io.connect('ringingroom.com',{secure:true, transports:['websocket']});

socketio.on('redirection', function(destination){
	window.location.href = destination;
});


tower_selector = new Vue({
	
	delimiters: ['[[',']]'], // don't interfere with flask

	el: "#tower-selector",

	data: { room_name: '' },

	methods: {

		send_room_name: function(room_name){
			console.log('Sending name: ' + this.room_name);
			socketio.emit('create_room',{room_name: this.room_name});
		},
	},

	template: `<form class="pure-form"
					v-on:submit.prevent="send_room_name">
				<fieldset>
					<legend>Create a new tower:</legend>
				<input type="text" 
				       class="pure-input"
					   v-model="room_name" placeholder="Tower Name" required>
				<button type="submit" class="pure-button pure-button-primary">Create</button>
				</fieldset>
				</form>
				`




});


};
