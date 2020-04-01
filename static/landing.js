window.onload = function() {

/* SOCKET */

	// for development
var socketio = io()


	// for server
// var socketio = io.connect('ringingroom.com',{secure:true, transports:['websocket']});

socketio.on('s_redirection', function(destination){
	window.location.href = destination;
});


socketio.on('s_check_id_success', function(msg){
	console.log('received success');
	tower_selector.message = "Join tower: " + msg.tower_name + '.';
});

socketio.on('s_check_id_failure', function(){
	console.log('received failure');
	tower_selector.message = "There is no tower with that code.";
	tower_selector.button_disabled = true;
});



tower_selector = new Vue({
	
	delimiters: ['[[',']]'], // don't interfere with flask

	el: "#tower-selector",

	data: { room_name: '',
			join_room: false,
			button_disabled: false,
			message: "To create a new tower, enter a name for that tower. To join a tower, enter the Tower ID number.",},

	methods: {

		send_room_name: function(){
			console.log('Sending name: ' + this.room_name);
			if (this.join_room){
				socketio.emit('c_join_tower_by_id',{tower_id: parseInt(this.room_name)});
			} else {
				socketio.emit('c_create_tower',{tower_name: this.room_name});
			}
		},

		check_tower_id: function(){
			console.log('checking, length is: ' + this.room_name.length);
			if (this.room_name.length == 9) {
				console.log('checking for integer');
				console.log(parseInt(this.room_name));
				try {
					room_code = parseInt(this.room_name)
					console.log('int: ' + room_code);
				}
				catch(error){
					console.log('nope')
					room_code = null
				}

				if (room_code){
					this.join_room = true;
					socketio.emit('c_check_tower_id',{tower_id: parseInt(this.room_name)});
				} else {
					this.join_room = false;
				}
			} else {
				this.button_disabled = false;
				this.join_room = false;
				this.message = "To create a new tower, enter a name for that tower. To join a tower, enter the Tower ID number.";
			}
		},
	},

	template: `<form class="pure-form"
					v-on:submit.prevent="send_room_name">
				<fieldset>
				<input type="text" 
				       class="pure-input"
					   v-model="room_name" 
					   placeholder="Tower name or ID number" 
					   v-on:input="check_tower_id"
					   required>
				<button type="submit" 
						:disabled="button_disabled"
						class="pure-button pure-button-primary">
					[[ join_room ? "Join" : "Create" ]]
				</button>
				</fieldset>
				<div id="join-message">[[ message ]]</div>
				</form>
				`

});


};
