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
logger.disableLogger()


// Set up socketio instance
var socketio = io()


////////////////////////
/* SOCKETIO LISTENERS */
////////////////////////

// Redirection: The server is sending the client to a tower
socketio.on('s_redirection', function(destination){
	window.location.href = destination;
});


// The user has entered (but not submitted) a valid tower_id; display a message
socketio.on('s_check_id_success', function(msg){
	console.log('received success');
	tower_selector.message = "Join tower: " + msg.tower_name + '.';
});

// The user has entered (but not submitted) an invalid tower_id; display a message
socketio.on('s_check_id_failure', function(){
	console.log('received failure');
	tower_selector.message = "There is no tower with that code.";
	tower_selector.button_disabled = true;
});


/////////
/* VUE */
/////////

Vue.options.delimiters = ['[[', ']]']; // make sure Vue doesn't interfere with jinja

// all vue objects needs to be defined within this block, so that the jinja templates are rendered first
$(document).ready(function() {

// This is the application instance for the page
tower_selector = new Vue({

	el: "#tower_selector",

	data: { input_field: '',
			join_tower: false,
			button_disabled: false,
            default_message: "To create a new tower, enter a name for that tower. To join a tower, enter the Tower ID number.",
			message: "To create a new tower, enter a name for that tower. To join a tower, enter the Tower ID number."},

	methods: {

        // Send the tower (or id) to the tower to create (or join) it
		send_tower_name: function(){
			console.log('Sending name: ' + this.input_field);

			if (this.join_tower){
                // what we have is an ID; parse it as int, then join that tower
				socketio.emit('c_join_tower_by_id',{tower_id: parseInt(this.input_field)});
			} else {
                //what we have is a name; create that tower
				socketio.emit('c_create_tower',{tower_name: this.input_field});
			}
		},

        // Fires on each keypress in the input box: Is this a tower_id?
		check_tower_id: function(){
			console.log('checking, length is: ' + this.input_field.length);

			if (this.input_field.length == 9) {
                // It's a valid length
				console.log('checking for integer');
				console.log(parseInt(this.input_field));
				try {
                    // it's an int, so it's a plausible tower_id
					tower_id = parseInt(this.input_field)
				}
				catch(error){
                    // it's  not a plausible tower_id
					console.log('not a valid tower_id')
					tower_id = null
				}

				if (tower_id){
                    // we found a valid tower_id
                    this.join_tower = true; //flag: on submit, try to join (rather than create)
                    // Ask the server if it's a known tower_id
					socketio.emit('c_check_tower_id',{tower_id: tower_id});
				} else {
                    // not a valid tower_id
                    this.join_tower = false;//flag: on submit, try to create
				}
			} else {
                // this doesn't look like a tower_id; make sure everything is back at default
				this.button_disabled = false;
				this.join_tower = false;
				this.message = this.default_message;
			}
		},
	},

    mounted: function() {
        this.$refs.tower_input.focus()
    },

	template: `<form class="form-group" v-on:submit.prevent="send_tower_name">

                    <div class="input-group">

                        <input class="form-control"
                               type="text" 
                               placeholder="Tower name or ID number" 
                               v-model="input_field" 
                               v-on:input="check_tower_id"
                               ref="tower_input"
                               required
                               >

                        <div class="input-group-append">

                            <button type="submit" 
                                    :disabled="button_disabled"
                                    class="btn btn-outline-primary"
                                    >
                                [[ join_tower ? "Join" : "Create" ]]
                            </button>

                        </div>
                    </div>

                    <div class="form-text text-muted text-justify" id="join-message"> 
                        [[ message ]]
                    </div>

				</form>
				`
}); // end tower_selector


}); // end document.ready
