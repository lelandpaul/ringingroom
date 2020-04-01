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

	data: { tower_name: '',
			join_tower: false,
			button_disabled: false,
			message: "To create a new tower, enter a name for that tower. To join a tower, enter the Tower ID number.",},

	methods: {

		send_tower_name: function(){
			console.log('Sending name: ' + this.tower_name);
			if (this.join_tower){
				socketio.emit('c_join_tower_by_id',{tower_id: parseInt(this.tower_name)});
			} else {
				socketio.emit('c_create_tower',{tower_name: this.tower_name});
			}
		},

		check_tower_id: function(){
			console.log('checking, length is: ' + this.tower_name.length);
			if (this.tower_name.length == 9) {
				console.log('checking for integer');
				console.log(parseInt(this.tower_name));
				try {
					tower_code = parseInt(this.tower_name)
					console.log('int: ' + tower_code);
				}
				catch(error){
					console.log('nope')
					tower_code = null
				}

				if (tower_code){
					this.join_tower = true;
					socketio.emit('c_check_tower_id',{tower_id: parseInt(this.tower_name)});
				} else {
					this.join_tower = false;
				}
			} else {
				this.button_disabled = false;
				this.join_tower = false;
				this.message = "To create a new tower, enter a name for that tower. To join a tower, enter the Tower ID number.";
			}
		},
	},

	template: `<form class="pure-form"
					v-on:submit.prevent="send_tower_name">
				<fieldset>
				<input type="text" 
				       class="pure-input"
					   v-model="tower_name" 
					   placeholder="Tower name or ID number" 
					   v-on:input="check_tower_id"
					   required>
				<button type="submit" 
						:disabled="button_disabled"
						class="pure-button pure-button-primary">
					[[ join_tower ? "Join" : "Create" ]]
				</button>
				</fieldset>
				<div id="join-message">[[ message ]]</div>
				</form>
				`

});
