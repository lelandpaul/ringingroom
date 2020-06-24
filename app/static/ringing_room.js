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
// logger.disableLogger()

// Set up socketio instance

var socketio = io(window.tower_parameters.server_ip);



// Various Vue instances need this on creation
var cur_tower_id = parseInt(window.tower_parameters.id);


// If they're not anonymous, get their username
var cur_user_name = window.tower_parameters.cur_user_name;

// Set up a handler for leaving, then register it *everywhere*

var leave_room = function(){
    socketio.emit('c_user_left',
          {user_name: window.tower_parameters.cur_user_name, 
           user_token: window.tower_parameters.user_token,
           anonymous_user: window.tower_parameters.anonymous_user,
          tower_id: cur_tower_id});
};

// set up disconnection at beforeunload
window.addEventListener("beforeunload", leave_room, "useCapture");
window.onbeforeunload = leave_room;

// initial data state
window.user_parameters = {
    bell_volume: 5,
};

////////////////////////
/* SOCKETIO LISTENERS */
////////////////////////

// A bell was rung
socketio.on('s_bell_rung', function(msg,cb){
	console.log('Received event: ' + msg.global_bell_state + msg.who_rang);
	// if(msg.disagree) {}
	bell_circle.ring_bell(msg.who_rang);
});

// Userlist was set
socketio.on('s_set_userlist', function(msg,cb){
    console.log('s_set_userlist: ' + msg.user_list);
    bell_circle.$refs.users.user_names = msg.user_list;
});

// User entered the room
socketio.on('s_user_entered', function(msg, cb){
    console.log(msg.user_name + ' entered')
    bell_circle.$refs.users.add_user(msg.user_name);
});

// User left the room
socketio.on('s_user_left', function(msg, cb){
    console.log(msg.user_name + ' left')
    bell_circle.$refs.users.remove_user(msg.user_name);
    bell_circle.$refs.bells.forEach((bell,index)=>
        {
            if (bell.assigned_user === msg.user_name) {
                bell.assigned_user = '';
            }
        });
});

// Number of observers changed
socketio.on('s_set_observers', function(msg, cb){
    console.log('observers: ' + msg.observers);
    bell_circle.$refs.users.observers = msg.observers;
});

// User was assigned to a bell
socketio.on('s_assign_user', function(msg, cb){
    console.log('Received user assignment: ' + msg.bell + ' ' + msg.user);
    bell_circle.$refs.bells[msg.bell - 1].assigned_user = msg.user;
    if (msg.user === window.tower_parameters.cur_user_name){
        bell_circle.$refs.users.rotate_to_assignment();
    }
});

// A call was made
socketio.on('s_call',function(msg,cb){
	console.log('Received call: ' + msg.call);
	bell_circle.$refs.display.make_call(msg.call);
});

// The server told us the number of bells in the tower
socketio.on('s_size_change', function(msg,cb){
	var new_size = msg.size;
	bell_circle.number_of_bells = new_size;
});


// The server sent us the global state; set all bells accordingly
socketio.on('s_global_state',function(msg,cb){
	var gstate = msg.global_bell_state;
	for (var i = 0; i < gstate.length; i++){
		bell_circle.$refs.bells[i].set_state_silently(gstate[i]);
	};
});

// The server told us whether to use handbells or towerbells
socketio.on('s_audio_change',function(msg,cb){
  console.log('changing audio to: ' + msg.new_audio);
  bell_circle.$refs.controls.audio_type = msg.new_audio;
  bell_circle.audio = msg.new_audio == 'Tower' ? tower : hand;
  // Make sure the volume is set consistently
  bell_circle.audio._volume = window.user_parameters.bell_volume * 0.1;
});

// A chat message was received
socketio.on('s_msg_sent', function(msg,cb){
    bell_circle.$refs.chatbox.messages.push(msg);
    if(msg.email != window.tower_parameters.cur_user_email && !$('#chat_input_box').is(':focus')) {
        bell_circle.unread_messages++;
    }
    bell_circle.$nextTick(function(){
        $('#chat_messages').scrollTop($('#chat_messages')[0].scrollHeight);
    });
});

// Host mode was changed
socketio.on('s_host_mode', function(msg,cb){
    bell_circle.$refs.controls.host_mode = msg.new_mode;
});

/////////
/* VUE */
/////////

// all vue objects needs to be defined within  document.read, so that the jinja
// templates are rendered first

// However, we need the main Vue to be accessible in the main scope
var bell_circle

$(document).ready(function() {

Vue.options.delimiters = ['[[', ']]']; // make sure vue doesn't interfere with jinja

/* BELLS */

// First, set up the bell component
// number — what bell
// poss — where in the tower (the css class)
// stroke — boolean — is the bell currently at hand?
// ring() — toggle the stroke, then 
Vue.component("bell_rope", {

	props: ["number", "position", "number_of_bells","audio"],

    // data in props should be a function, to maintain scope
	data: function() {
	  return { stroke: true,
			   circled_digits: ["①", "②", "③", "④", "⑤", "⑥", 
								"⑦", "⑧", "⑨", "⑩", "⑪","⑫"],
			   images: ["handstroke", "backstroke"],
               assigned_user: window.tower_parameters.assignments[this.number-1],
	  };
	},

    computed: {

        image_prefix: function(){
            return this.$root.$refs.controls.audio_type === 'Tower' ? 't-' : 'h-';
        },

        assignment_mode: function(){
            return this.$root.$refs.users.assignment_mode;
        },

        cur_user: function(){
            return this.$root.$refs.users.cur_user;

        },

        left_side: function(){
            if (this.position == 1) { return false };
            if (this.position <= (this.number_of_bells/2)+1) { return true };
            return false;
        },

        top_side: function(){
            if (this.number_of_bells === 4 && this.position >=3) {return true};
            if (this.number_of_bells === 6 && (this.position === 4 || this.position === 5)) 
                {return true};
            if (this.number_of_bells === 8 && this.position >= 4 && this.position !== 8) 
                {return true};
            if (this.number_of_bells === 10 && this.position >= 5 && this.position < 9) 
                {return true};
            if (this.number_of_bells === 12 && this.position >= 5 && this.position <= 10) 
                {return true};
        },

    },

	methods: {

      
      // emit a ringing event ot the server
	  emit_ringing_event: function() {
        if (window.tower_parameters.anonymous_user){ return }; // don't ring if not logged in
        if (this.assignment_mode){ return }; // disable while assigning
        if (this.$root.$refs.controls.host_mode && this.assigned_user !== cur_user_name){
            // user is not allowed to ring this bell
            bell_circle.$refs.display.display_message('You may only ring your assigned bells.');
            return
        }
		socketio.emit('c_bell_rung',
				{bell: this.number, stroke: this.stroke, tower_id: cur_tower_id});
		var report = "Bell " + this.number + " will ring a " + (this.stroke ? "handstroke":"backstroke");
		console.log(report);
	  },

      // Ringing event received; now ring the bell
	  ring: function(){
        this.stroke = !this.stroke;
        const audio_type = this.$root.$refs.controls.audio_type;
        console.log(audio_type + ' ' + this.number_of_bells);
		this.audio.play(bell_mappings[audio_type][this.number_of_bells][this.number - 1]);
		var report = "Bell " + this.number + " rang a " + (this.stroke ? "backstroke":"handstroke");
		console.log(report);
	  },
	
      // global_state received; set the bell to the correct stroke
	  set_state_silently: function(new_state){
		  console.log('Bell ' + this.number + ' set to ' + new_state)
		  this.stroke = new_state
	  },

      assign_user: function(){
          if (window.tower_parameters.anonymous_user){ return }; // don't ring if not logged in
          if (this.assigned_user){ return }; // don't kick people off
          const selected_user = this.$root.$refs.users.selected_user;
          if (!this.assignment_mode){ return };
          console.log('assigning user: ' +  selected_user + ' to ' + this.number);
          socketio.emit('c_assign_user', { bell: this.number,
                                           user: selected_user,
                                           tower_id: cur_tower_id });
      },

      unassign: function(){
          if (window.tower_parameters.anonymous_user){ return }; // don't ring if not logged in
          socketio.emit('c_assign_user', { bell: this.number,
                                           user: '',
                                           tower_id: cur_tower_id });
      },

    },

	template:`
            <div class="bell unclickable_div"
                 :class="[left_side ? 'left_side' : '',
                          image_prefix === 'h-' ? 'handbell' : '',
                          top_side ? 'top_side' : '',
                          window.tower_parameters.anonymous_user ? 'no_ring' : '']">
                <div class="row unclickable_div"
                    :class="[left_side ? 'flex-row-reverse' :  '',
                             top_side ? 'align-items-start' : 'align-items-end']">

                     <img @click='emit_ringing_event'
                           class="bell_img clickable" 
                          :class="[assignment_mode ? 'assignment_mode' : '']"
                          :src="'static/images/' + image_prefix + (stroke ? images[0] : images[1]) + '.png'"
                          />


                    <div class="bell_metadata clickable">


                    <template v-if="left_side">
                        <div class="btn-group user_cartouche">
                            <button class="btn btn-sm btn_unassign"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-primary' : 'btn-outline-secondary']"
                                v-if="assignment_mode && assigned_user &&
                                !(assigned_user!==cur_user && $root.$refs.controls.lock_controls)"
                                @click="unassign">
                                <span class="unassign"><i class="fas fa-window-close"></i></span>
                            </button>

                            <button class="btn btn-small btn_assigned_user"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                                            assigned_user ? 'disabled' : '',
                                            assigned_user==cur_user ? 'cur_user' :'',
                                            assignment_mode ? '' : 'disabled']"
                                   @click="assign_user"
                                   v-if="assignment_mode || assigned_user"
                                  > 
                                  <span class="assigned_user">
                                    [[ (assignment_mode) ? 
                                        ((assigned_user) ? assigned_user : '(none)')
                                        : assigned_user ]]
                                  </span>
                             </button>

                             <button class='btn btn-sm btn_number' 
                                 :class="[number == 1 ? 'treble' : 'active',
                                            number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                                          assigned_user == cur_user ? 'cur_user' : '']"
                                  style="cursor: inherit;"
                                  >
                                <span class="number"> [[number]] </number>
                             </button>
                        </div>
                    </template>
                    <template v-else>
                        <div class="btn-group user_cartouche">
                             <button class='btn btn-sm btn_number' 
                                 :class="[number == 1 ? 'treble' : 'active',
                                            number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                                          assigned_user == cur_user ? 'cur_user' : '']"
                                  style="cursor: inherit;"
                                  >
                                <span class="number">[[number]]</span>
                             </button>

                             <button class="btn btn-small btn_assigned_user"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-primary' : 'btn-outline-secondary',
                                            assigned_user==cur_user ? 'cur_user' :'',
                                            assigned_user ? 'disabled' : '',
                                            assignment_mode ? '' : 'disabled']"
                                  @click="assign_user"
                                  v-if="assignment_mode || assigned_user"
                                   > 
                                  <span class="assigned_user_name">
                                     [[ (assignment_mode) ? 
                                         ((assigned_user) ? assigned_user : '(none)')
                                         : assigned_user ]]
                                  </span>
                              </button>

                             <button class="btn btn-sm btn_unassign"
                                   :class="[number == 1 ? 'treble' : '',
                                            number == 1 ? 'btn-primary' : 'btn-outline-secondary']"
                                    v-if="assignment_mode && assigned_user &&
                                !(assigned_user!==cur_user && $root.$refs.controls.lock_controls)"
                                    @click="unassign">
                                 <span class="unassign"><i class="fas fa-window-close"></i></span>
                             </button>
                        </div>
                    </template>

                    </div>
                    </div>
                </div>
            </div>
		     `

}); // End bell_rope component

// The call_display is where call messages are flashed
Vue.component('call_display', {

    props: ["audio"],

    // data in components should be a function, to maintain scope
	data: function(){
		return { cur_call: '' };
	},

    computed: {

        assignment_mode: function(){
            return this.$root.$refs.users.assignment_mode;
        },


    },

	methods: {

        // Used to display temporary messages to users (typically when they do something they're
        // not permitted to do in host-mode).
        display_message: function(message){
            console.log('display message: ', message);
			this.cur_call = message;
			var self = this;
            // remove the call after 2 seconds
			setTimeout(function() { self.cur_call = ''; 
						console.log('changing cur_call back');}, 3000);

        },

        // a call was received from the server; display it and play audio
		make_call: function(call){
			console.log('changing cur_call to: ' + call);
			this.cur_call = call;
			this.audio.play(call);
			var self = this;
            // remove the call after 2 seconds
			setTimeout(function() { self.cur_call = ''; 
						console.log('changing cur_call back');}, 2000);
		}
	},

	template: `<h2 id='call_display' 
                   ref='display'>
                   [[ assignment_mode ? 'To resume ringing, press "Stop Assigning" on the control panel.' : cur_call ]]
               </h2>
              `
}); // end call_display component


// The focus_display indicated when the window has lost focus
Vue.component('focus_display', {

    // data in components should be a function, to maintain scope
	data: function(){
		return { visible: true };
	},

    mounted: function() {
        this.$nextTick(function() {
            window.addEventListener('focus', this.hide)
            window.addEventListener('blur', this.show)

            document.hasFocus() ? this.hide() : this.show()
        })
    },

    methods: {
        show() {
            this.visible = true;
        },
        hide() {
            this.visible = false;
        }
    },

	template: `<h2 v-show="visible" id='focus_display'>
                   Click anywhere in Ringing Room to resume ringing.
               </h2>
              `
}); // end focus_display component


// tower_controls holds title, id, size buttons, audio toggle
Vue.component('tower_controls', {

    // data in components should be a function, to maintain scope
	data: function(){ 
		return {tower_sizes: [4,6,8,10,12],
                audio_type: window.tower_parameters.audio,
                host_mode: window.tower_parameters.host_mode} },

    computed: {
        
        number_of_bells: function() {
            return this.$root.number_of_bells;
        },

        lock_controls: function(){
            return this.host_mode && !window.tower_parameters.host_permissions;
        }

    },

    watch: {

        audio_type: function(){
            console.log('swapped audio type');
              socketio.emit('c_audio_change',{new_audio: this.audio_type, tower_id: cur_tower_id});
        },

        host_mode: function(){
            console.log('swapped host mode to: ' + this.host_mode);
            socketio.emit('c_host_mode',{new_mode: this.host_mode, tower_id: cur_tower_id});

        },

    },

	methods: {

        // the user clicked a tower-size button
		set_tower_size: function(size){
            if (window.tower_parameters.anonymous_user){ return }; // don't do anything if not logged in
			console.log('setting tower size to ' + size);
			socketio.emit('c_size_change',{new_size: size, tower_id: cur_tower_id});
		},

        set_bells_at_hand: function(){
            if (window.tower_parameters.anonymous_user){ return }; // don't do anything if not logged in
            console.log('setting all bells at hand')
            socketio.emit('c_set_bells', {tower_id: cur_tower_id});
        },
	},

	template: 
    `
        <div class="tower_controls_inner"
             v-if="!window.tower_parameters.anonymous_user">

             <div class="row justify-content-between"
                  v-if="window.tower_parameters.host_permissions">

                  <div class="col">
                    <h4 class="mb-0 pt-1">Host Mode:</h4>
                  </div>

                 <div class="col">
                      <div class="btn-group btn-block btn-group-toggle align-bottom">
                        <label class="btn btn-outline-primary"
                               :class="{active: !host_mode}">
                        <input type="radio" 
                               name="host_mode"
                               id="host_false"
                               :value="false"
                               v-model="host_mode"
                               />
                               Off
                        </label>

                        <label class="btn btn-outline-primary"
                               :class="{active: host_mode}">
                        <input type="radio" 
                               name="host_mode"
                               id="host_true"
                               :value="true"
                               v-model="host_mode"
                               />
                               On
                        </label>
                       </div>
                 </div>
             </div>

             <div v-if="lock_controls" class="row">
                <div class="col">
                    <small class="text-muted">
                        Host mode is enabled. Only hosts can change tower settings or assign bells.
                    </small>
                </div>
             </div>

             <div class="row between-xs">
             <div class="col">
                <div class="btn-group btn-block btn-group-toggle">
                    <label v-for="size in tower_sizes"
                           :size="size"
                           class="btn btn-outline-primary"
                           :class="{active: size === number_of_bells,
                                    disabled: lock_controls}"
                           @click="set_tower_size(size)"
                           >
                           <input type="radio"
                                  name="size"
                                  :value="size"
                                  />
                                  [[ size ]]
                      </label>
                </div>
            </div>
            </div>


             <div class="row justify-content-between">

                 <div class="col">
                      <div class="btn-group btn-block btn-group-toggle">
                        <label class="btn btn-outline-primary"
                               :class="{active: audio_type == 'Tower',
                                    disabled: lock_controls}">
                        <input type="radio" 
                               name="audio"
                               id="audio_tower"
                               value="Tower"
                               v-model="audio_type"
                               />
                               Tower
                        </label>

                        <label class="btn btn-outline-primary"
                               :class="{active: audio_type == 'Hand',
                               disabled: lock_controls}"
                               >
                        <input type="radio" 
                               name="audio"
                               id="audio_hand"
                               value="Hand"
                               v-model="audio_type"
                               />
                               Hand
                        </label>
                       </div>
                 </div>

                 <div class="col">
                     <button class="set_at_hand btn btn-outline-primary btn-block"
                           :class="{disabled: lock_controls}"
                           @click="set_bells_at_hand"
                           >
                         Set at hand
                     </button>
                </div>
             </div>

             <user

        </div> <!-- tower controls -->
    `,
}); // End tower_controls





// help holds help toggle
Vue.component('help', {

    // data in components should be a function, to maintain scope
	data: function(){
		return {help_showing: false} },

	methods: {

        // the user clicked the audio toggle
        show_help: function(){
          console.log('showing or hiding help');
          this.help_showing = !this.help_showing

        },
	},


	template: `
<div class="row" v-if="!window.tower_parameters.observer">
<div class="col">
<div class="card text-justify">
<div class="card-body">
<h5 class="card-title">How to use Ringing Room</h5>

<p>To ring, you may either click on the ropes or use the following hot-keys:</p>

<ul>
    <li> <b>[1-9], [0], [-], [=]:</b> Rings bells 1 - 9, 10, 11, and 12</li>
    <li><b>[SPACE]:</b> Rings the bell in the lower right corner.</li>
    <li><b>[LEFT] and [RIGHT] arrow keys:</b> Rings the left and right bottom-most bells.</li>
    <li><b>[f] and [j]:</b> same as [LEFT] and [RIGHT]</li>
    <li><b>[SHIFT]+[0-9]\\[0]\\[-]\\[=]:</b> Rotate the "perspective" of the ringing room to put that bell in the lower right corner so it may be rung by [SPACE] or [j].</li>
</ul>

<p> The tower controls allow you to set the number of bells, change whether you're using towerbell or handbell images and sounds, and set all the bells at hand.</p>

<p>The user list allows you to <i>assign bells</i> to particular ringers. To assign ringers, press the "Assign Bells" button to enter bell assignment mode. While in this mode, you may select any ringer from the user list by clicking on them, and then click on the box next to the bell you want to assign them to. Clicking the "x" by a user's name will unassign them from that bell. While in assignment mode, you can't ring any bells; when you're done assigning bells, click the "Stop Assigning" button to return to normal mode.</p>

<p>Assigning a user to a bell will have the effect of automatically rotating that ringer's "perspective" on the tower so that the bell is placed in the bottom right position. This will allow it to be rung using the [SPACE] or [j] hotkeys. If a user is assigned to multiple bells, the lowest-numbered one will be placed in position; this means that if the user is assigned to exactly 2 bells, those bells we be ringable with [f] and [j].</p>

			
<p>You can make calls by using the hotkeys below. However, be aware that in some browsers these result in the sound of the bells being interrupted.</p>

<ul>
    <li><b>[l]</b>ook to...</li>
    <li><b>[g]</b>o next time</li>
    <li><b>[b]</b>ob</li>
    <li>si<b>[n]</b>gle</li>
    <li>t<b>[h]</b>at's all</li>
    <li>s<b>[t]</b>and next</li>
</ul>

You can read more on our <a href="/help">Help page</a>.
</div>
</div>
</div>
</div>
</div>
               `,
}); // End help

Vue.component('chatbox', {

    data: function(){
        return { name: window.tower_parameters.cur_user_name,
                 cur_msg: '',
                 messages: [],
        }
    },

    props: ["unread_messages"],

    methods: {

        send_msg: function() {
            console.log('send_msg');
            socketio.emit('c_msg_sent', { user: this.name,
                                          email: window.tower_parameters.cur_user_email,
                                          msg: this.cur_msg,
                                          time: new Date(),
                                          tower_id: window.tower_parameters.id});
            this.cur_msg = '';
        },

        leave_tower: function() {
            leave_room();
        },

        remove_all_unreads: function(){
            bell_circle.unread_messages = 0;
        },

    },


    template: `
        <div class="card" id="chatbox">
            <div class="card-header">
                <h2 style="display: inline; cursor: pointer;"
                    id="chat_header"
                    data-toggle="collapse"
                    data-target="#chat_body"
                    >
                    Chat <span class="badge badge-dark" v-if="unread_messages > 0"> [[ unread_messages ]] </span><span class="sr-only" v-if="unread_messages > 0">unread messages</span>
                     <span class="float-right w-50"
                           @click="leave_tower">
                        <a role="button" class="btn btn-outline-primary w-100" href='/my_towers'>Leave Tower</a>
                     </span>
                </h2>
            </div>
            <div class="card-body collapse show" 
                 id="chat_body"
                 >
                <div class="row no-gutters p-0" id="chat_messages">
                    <div class="col p-0">
                        <div class="message" v-for="msg in messages">
                            <span class="msg_username">[[msg.user]]:</span>
                            <span class="msg_msg">[[msg.msg]]</span>
                        </div>
                    </div>
                </div>
                <div class="row no-gutters p-0" id="chat_input">
                <div class="col p-o">
                <form action="" @submit.prevent="send_msg">
                <div class="input-group">
                    <input type="text" 
                           id="chat_input_box"
                           class="form-control" 
                           placeholder=""
                           v-model="cur_msg"
                           @focus="remove_all_unreads"
                           ></input>
                    <div class="input-group-append">
                        <input class="btn btn-outline-primary" 
                                type="submit"
                                value="Send"></input>
                    </div>
                </form>
                </div>
                </div>
                <div class="row my-n1 p-0">
                <div class="col mb-n2 pb-0">
                    <small style="font-size: 1rem;">
                        <a href="#"
                           data-toggle="modal"
                           data-target="#code_of_conduct"
                            >
                            Code of Conduct
                        </a> &#8226
                        <a href="#"
                        data-toggle="modal"
                        data-target="#report_box"
                            >
                            Report behavior
                        </a>
                    </small>
                </div>
                </div>
            </div>
        </div>
              `


});

// For silly CSS reasons, this needs to be it's own Vue instance
var report_form = new Vue({

    el: '#report_box',

    data: { report_description: '',
            unsubmitted: true,},
    
    methods: {

        send_report: function() {
            socketio.emit('c_report',
                            { time: new Date(),
                              user: window.tower_parameters.cur_user_name,
                              email: window.tower_parameters.cur_user_email,
                              report_description: this.report_description,
                              messages: bell_circle.$refs.chatbox.messages });
            this.unsubmitted = false;

            setTimeout( function(){
                $('#report_box').modal('hide');
                report_form.unsubmitted = true;
                report_form.report_description = '';
            }, 3000);
        },

    },

    template: `
    <div id="report_box" 
         tabindex="-1"
         class="modal fade">
         <div class="modal-dialog">
            <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Report inappropriate behavior</h4>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group" v-if="unsubmitted">
                    <textarea id="report_textarea" 
                              class="form-control"
                              rows="4" 
                              v-model="report_description"
                              placeholder="Please describe the behavior you would like to report.">
                    </textarea>
                </div>
                <div v-else>
                    <p> Thank you — your report and a log of the chat has been submitted to the developers.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button"
                        class="btn btn-secondary" data-dismiss="modal">
                        [[ unsubmitted ? 'Cancel' : 'Close' ]]
                </button>
                <button type="button" 
                        v-if="unsubmitted"
                        class="btn btn-primary"
                        @click="send_report"
                        >
                        Send report
                </button>
            </div>
            </div>
        </div>
    </div>
    `



});

Vue.component('volume_control', {
    data: function() {
        return {
            value: window.user_parameters.bell_volume,
        }
    },

    watch: {
        value: function(new_value) {
            window.user_parameters.bell_volume = new_value;
            bell_circle.audio._volume = window.user_parameters.bell_volume * 0.1;
        },
    },

    template: `
    <div class="row justify-content-between mt-n2">
        <!-- slider bar overlaps its own padding, so put it in a div to make it line up with the edges-->
        <div class="col-2 pl-4">
        <i class="fas fa-volume-down volume_icon align-middle"></i>
        </div>
        <div class="col-8 px-0 align-middle">
            <input type="range" v-model="value" min=0 max=10 id="volumeSlider" class="volume_control_slider custom-range align-middle">
            </input>
        </div>
        <div class="col-2">
        <i class="fas fa-volume-up volume_icon align-middle"></i>
        </div>
        </div>
    </div>
`
});


// user_display holds functionality required for users
Vue.component('user_display', {

    // data in components should be a function, to maintain scope
	data: function(){
		return { user_names: [],
                 assignment_mode: false,
                 selected_user: '',
                 cur_user: window.tower_parameters.cur_user_name,
                 observers: parseInt(window.tower_parameters.observers),
        } },

    computed: {
            cur_user_bells: function(){
                var bell_list = []
                this.$root.$refs.bells.forEach((bell,index) =>
                    {if (bell.assigned_user === this.cur_user){
                        bell_list.push(index+1);
                    } 
                });
                return bell_list;
            }
    },


    methods: {

        toggle_assignment: function(){
            if (window.tower_parameters.anonymous_user){ return }; // don't do anything if not logged in
            $('#user_display_body').collapse('show');
            this.assignment_mode = !this.assignment_mode;
            if (this.assignment_mode){
                this.selected_user = this.cur_user;
            } else {
                this.rotate_to_assignment();
            }
        },

        rotate_to_assignment: function(){
            if (window.tower_parameters.anonymous_user){ return }; // don't do anything if not logged in
            console.log('rotating to assignment')
            // Don't rotate while assigning bells
            if (this.assignment_mode){ return };

            // Don't rotate if the user has no name yet
            if (!this.cur_user){ return };

            console.log(this.cur_user_bells);
            // the user has no bells; don't screw with rotation
            if (this.cur_user_bells === []){
                console.log('skipping — no assigned bells');
                return;
            };
            const rotate_to = Math.min(...this.cur_user_bells);
            this.$root.rotate(rotate_to);
        },


        select_user: function(user){
            if (window.tower_parameters.anonymous_user){ return }; // don't do anything if not logged in
            if (this.$root.$refs.controls.lock_controls){
                return
            };
            this.selected_user = user;
        },

        add_user: function(user){
            if (!this.user_names.includes(user)){
                this.user_names.push(user);
            }
        },

        remove_user: function(user){
            console.log('removing user: ' + user);
            const index = this.user_names.indexOf(user);
            if (index > -1) {
              this.user_names.splice(index, 1);
            }
        },


    },

	template: 
    `
         <div class="card mb-3">
             <div class="card-header"
                  v-if="!window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link"
                  >
                <h2 style="display: inline; cursor: pointer;"
                    id="user_display_header"
                    data-toggle="collapse"
                    data-target="#user_display_body">
                        Users 
                </h2>
                <span class="float-right w-50">
                <button class="btn btn-outline-primary w-100"
                        :class="{active: assignment_mode}"
                        @click="toggle_assignment"
                        >
                   [[ assignment_mode ? 'Stop assigning' : 'Assign bells' ]]
                 </button>
                 </span>
             </div>
             <div class="card-header"
                  v-else
                  >
                <h2 style="display: inline;">
                        Users
                </h2>
             </div>
             <ul class="list-group list-group-flush show"
                 id="user_display_body"
                 :class="{collapse: (!window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link)}"
                 >
                <li class="list-group-item cur_user d-inline-flex align-items-center"
                     :class="{assignment_active: assignment_mode,
                              active: cur_user == selected_user && assignment_mode}"
                     v-if="window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link"
                     >
                     <span class="mr-auto">Log in to ring</span>
                     <span class="float-right">
                     <a class="btn btn-outline-primary btn-sm" 
                        :href="'/authenticate?next=' + window.location.pathname">Log In</a>
                     </span>
                </li>
                <li class="list-group-item list-group-item-action cur_user d-inline-flex align-items-center"
                     :class="{assignment_active: assignment_mode,
                              active: cur_user == selected_user && assignment_mode}"
                     v-if="!window.tower_parameters.anonymous_user"
                     @click="select_user(cur_user)"
                     >
                     <span class="user_list_cur_user_name mr-auto">[[ cur_user ]]</span>
                 </li>
                 <li v-if="$root.$refs.controls.lock_controls"
                     class="list-group-item">
                     <small class="text-muted">In host mode, you may catch hold, but not assign others.</small>
                 </li>
                <li v-for="user in user_names"
                    class="list-group-item list-group-item-action"
                    v-if="user != cur_user"
                     :class="{cur_user: user == cur_user,
                              disabled: !assignment_mode || $root.$refs.controls.lock_controls,
                              assignment_active: assignment_mode,
                              active: user == selected_user && assignment_mode}"
                     @click="select_user(user)"
                 >
                            [[ user ]]
                 </li>
                 </ul>
            </div>
        `,
}); // End user_display


// The master Vue application
bell_circle = new Vue({

	el: "#bell_circle",

    mounted: function() {
        
        /////////////////
        /* Tower setup */
        /////////////////

        // set this separately so that the watcher fires
        this.number_of_bells = window.tower_parameters.size;


        // Join the tower
        socketio.emit('c_join',{tower_id: cur_tower_id, 
                                user_token: window.tower_parameters.user_token,
                                anonymous_user: window.tower_parameters.anonymous_user})

        this.$nextTick(function(){
            this.$refs.users.rotate_to_assignment();
        });

        if (!window.tower_parameters.anonymous_user){
			console.log('turning on keypress listening')

            // Do a special thing to prevent space from pressing focused buttons
            window.addEventListener('keyup', (e) => {
                this.keys_down.splice(this.keys_down.indexOf(e.key),1)
                if (e.which == 32 && !$('#chat_input_box').is(':focus')) {
                    e.preventDefault();
                }
            });

            $('[data-toggle="tooltip"]').tooltip();

			window.addEventListener('keydown', (e) => {
			e = e || window.event;
			const key = e.key; // this wil be the character generated by the keypress
			// Shift+1 produces code "Digit1"; this gets the digit itself
			const code = e.code[e.code.length - 1];

            if ($("#chat_input_box").is(":focus")){
                if (key == 'Escape') {
                    $('#chat_input_box').blur();
                } else return; // disable hotkeys when typing
            }

            if ($('#report_box').hasClass('show')) {
                return; // disable hotkeys when the report is active
            }


            if (bell_circle.keys_down.includes(key)){ return };
            bell_circle.keys_down.push(key);


            // Do a special thing to prevent space and the arrow keys from hitting focused elements
            if (e.which == 32 || e.which == 37 || e.which == 39) {
                e.preventDefault();

            }

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


			const n_b = bell_circle.number_of_bells;
			// Space, j, and ArrowRight ring the bell in position n/2
			if ([' ','j','J','ArrowRight'].includes(key)){
				bell_circle.pull_rope_by_pos(1);
			}

			// f and ArrowLeft ring the bell in position n/2 + 1
			if (['f','F','ArrowLeft'].includes(key)){
				bell_circle.pull_rope_by_pos(2);
			}

			// Calls are: g = go; h = stop; b = bob; n = single.
			if (['b','B'].includes(key)){
				console.log('calling bob');
				bell_circle.make_call('Bob');
			}
			if (['n','N'].includes(key)){
				console.log('calling single');
				bell_circle.make_call('Single');
			}

			if(['g','G'].includes(key)){
				console.log('calling go');
				bell_circle.make_call('Go');
			}

			if (['h','H'].includes(key)){
				console.log('calling stop');
				bell_circle.make_call("That's all");
			}

			if (['t','T'].includes(key)){
				console.log('calling stand');
				bell_circle.make_call("Stand next");
			}

			if (['l','L'].includes(key)){
				console.log('calling look-to');
				bell_circle.make_call("Look to");
			}
            });
        };

    },

	data: {
		number_of_bells: 0,
		bells: [],
        rang_bell_recently: [],
        audio: window.tower_parameters.audio == 'Tower' ? tower : hand,
        call_throttled: false,
        tower_name: window.tower_parameters.name,
        tower_id: parseInt(window.tower_parameters.id),
        hidden_sidebar: true,
        hidden_help: true,
        keys_down: [],
        unread_messages: 0,
        host_mode: window.tower_parameters.host_mode,
        bookmarked: window.tower_parameters.bookmarked,
	},

	watch: {
        // Change the list of bells to track the current number
		number_of_bells: function(new_count){
            console.log('changing number of bells to ' + new_count)
			const new_bells = [];
			for (var i=1; i <= new_count; i++){
                console.log('pushing bell: ' + i);
				new_bells.push({number: i, position: i});
                console.log(new_bells);
			}
            console.log(new_bells);
			this.bells = new_bells;
			this.rang_bell_recently = new Array(new_count).fill(false);
            // Request the global state from the server
            socketio.emit('c_request_global_state', {tower_id: cur_tower_id});
		},

	},

	methods: {

      
      // the server rang a bell; find the correct one and ring it
	  ring_bell: function(bell) {
		console.log("Ringing the " + bell)
		this.$refs.bells[bell-1].ring()
	  },

    
      // Trigger a specific bell to emit a ringing event
	  pull_rope: function(bell) {
        if (this.rang_bell_recently[bell-1]) { return; }
        console.log("Pulling the " + bell);
        this.$refs.bells[bell-1].emit_ringing_event();
        this.rang_bell_recently[bell-1] = true;
        setTimeout(()=>{this.rang_bell_recently[bell-1] = false;}, 250);
	  },
	
      // Like ring_bell, but calculated by the position in the circle (respecting rotation)
	  ring_bell_by_pos: function(pos){
			for (bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.ring_bell(this.bells[bell]['number']);
					return true;
					}
				}
		},

      // Like pull_rope, but calculated by the position in the circle (respecting rotation)
	  pull_rope_by_pos: function(pos){
			for (var bell in this.bells){
				if (this.bells[bell]['position'] == pos){
					this.pull_rope(this.bells[bell]['number']);
					return true;
					}
				}
		},

      // emit a call
	  make_call: function(call){
        if (this.$root.$refs.users.cur_user_bells.length == 0 && this.$root.$refs.controls.lock_controls){
            // user is not allowed to make calls
            this.$root.$refs.display.display_message('Only hosts may make calls when not assigned to a bell.');
            return
        };
        if (this.call_throttled){ return };
        socketio.emit('c_call',{call: call,tower_id: cur_tower_id});
        this.call_throttled = true;
        setTimeout(()=>{this.call_throttled = false}, 500);
	  },
	
      // rotate the view of the circle
	  rotate: function(newposs){
		  if (newposs > this.number_of_bells) {
              // the user tried to rotate to a bell that doesn't exist
			  return false;
		  }

          // how many positions to rotate?
		  var offset = this.number_of_bells - newposs;
		  var oldposs = 0;
		  var n_b = this.number_of_bells

		  for (var bell in this.bells){
              // change the position of each bell
			  var number = this.bells[bell]['number'];
			  this.bells[bell]['position'] = (number + offset)%n_b + 1;
		  };

          // We need the Vue's list to be sorted by position
		  this.bells = this.bells.sort(
			  function(a,b){
				  return a['position'] - b['position'];
			  });

	  },

      toggle_controls: function() {
          $('#help').collapse('hide');
          this.hidden_help = true;
          this.hidden_sidebar = !this.hidden_sidebar;
      },

      toggle_help: function() {
          if (window.tower_parameters.observer){ return } // don't do anything if in listener mode
          $('#tower_controls').collapse('hide');
          this.hidden_sidebar = true;
          this.hidden_help = !this.hidden_help;
      },

      copy_id: function() {

          setTimeout(() => {$('#id_clipboard_tooltip').tooltip('hide')},1000);
              var dummy = document.createElement("textarea");
              document.body.appendChild(dummy);
              dummy.value = cur_tower_id;
              dummy.select();
              document.execCommand("copy");
              document.body.removeChild(dummy);
      },

      toggle_bookmark: function(){
          socketio.emit('c_toggle_bookmark',cur_tower_id);
          this.bookmarked = !this.bookmarked;
      }, 
	},

	template: 
    `
        <div id="bell_circle_wrapper">

        <div class="row flex-lg-nowrap" id="sidebar_col_row">
        
        <div class="col-12 col-lg-4 sidebar_col"> <!-- sidebar col -->

        <div class="tower_header">
        <div class="row">
             <div class="col text-nowrap">
                 <i class="fa-bookmark align-text-top fa-fw"
                    :class="[bookmarked ? 'fas' : 'far']"
                    style="cursor:pointer"
                    @click="toggle_bookmark"
                 ></i>
                 <h1 id="tower_name" class="d-inline d-lg-none text-wrap"> [[ tower_name ]] </h1>
                 <h1 id="tower_name" class="d-none d-lg-inline"> [[ tower_name ]] </h1>
             </div>
         </div>

         <div class="row">
             <div class="col">
                 <div class="row justify-content-between">
                     <div class="col-auto mb-3 mb-sm-0">

                     <div class="tower_id input-group" style="flex-wrap:nowrap">
                        <div class="input-group-prepend">
                            <span class="input-group-text">[[tower_id]]</span>
                        </div>
                        <div class="input-group-append">
                            <button class="btn btn-outline-primary"
                               data-toggle="tooltip"
                               data-placement="bottom"
                               data-container="body"
                               data-trigger="click"
                               id="id_clipboard_tooltip"
                               @click="copy_id"
                               title="Copied to clipboard">
                                   <i class="far fa-clipboard fa-fw"></i>
                            </button>
                        </div>
                     </div>
                     </div>
                     <div class="w-100 d-block d-sm-none"></div>
                     <div class="col-auto mb-3 mb-sm-0">
                        <button class="toggle_help btn btn-outline-primary"
                                data-toggle="collapse"
                                data-target="#help"
                                v-if="!window.tower_parameters.listen_link"
                                @click="toggle_help"
                                >
                                Help [[ hidden_help ? '▸' : '▾' ]]
                            </button>
                     </div>
                     <div class="col-auto toggle_controls d-lg-none">
                         <button class="toggle_controls btn btn-outline-primary" 
                                 data-toggle="collapse"
                                 data-target="#tower_controls"
                                 @click="toggle_controls"
                                >
                         Controls 
                         <span class="badge badge-dark" v-if="hidden_sidebar && unread_messages > 0 && !window.tower_parameters.listen_link && !window.tower_parameters.anonymous_user"> [[ unread_messages ]] </span>
                         <span class="sr-only" v-if="hidden_sidebar && unread_messages > 0 && !window.tower_parameters.listen_link && !window.tower_parameters.anonymous_user">unread messages</span>
                         [[ hidden_sidebar ? '▸' : '▾' ]]
                         </button>
                     </div>
                 </div>
            </div>
        </div>
        </div> <!-- tower header -->

        <div class="help collapse" id="help">
        
             <help ref="help"></help>
         </div>

        <div class="tower_controls collapse"
             id="tower_controls"
             >

        <volume_control ref="volume"></volume_control>


        <tower_controls ref="controls"></tower_controls>
        
        <template v-if="!window.tower_parameters.anonymous_user && !window.tower_parameters.listen_link">
            <div class="row pb-0 flex-grow-1">
            <div class="col flex-grow-1">
            <user_display ref="users"></user_display>
            <chatbox ref="chatbox" v-bind:unread_messages="unread_messages"></chatbox>
            </div>
            </div>
        </template>
        <template v-else>
            <div class="row pb-0 flex-grow-1">
            <div class="col flex-grow-1">
            <user_display ref="users"></user_display>
            </div>
            </div>
        </template>




        </div> <!-- hidden sidebar -->

        </div> <!-- sidebar col -->


        <div class="col-12 col-lg-8 bell_circle_col"> <!-- bell circle col -->

        <div class="bell_circle"
             v-bind:class="[number_of_bells == 4 ? 'four'    : '',
                            number_of_bells == 6  ? 'six'    : '',
                            number_of_bells == 8  ? 'eight'  : '',
                            number_of_bells == 10 ? 'ten'    : '',
                            number_of_bells == 12 ? 'twelve' : '']">
            <call_display v-bind:audio="audio" ref="display"></call_display>
            <focus_display ref="focus"></focus_display>
              <bell_rope v-for="bell in bells"
                         v-bind:key="bell.number"
                         v-bind:number="bell.number"
                         v-bind:position="bell.position"
                         v-bind:number_of_bells="number_of_bells"
                         v-bind:audio="audio"
                         v-bind:id="bell.number"
                         ref="bells"
                         ></bell_rope>
        </div> <!-- bell_circle -->
        </div> <!-- row -->

        </div>
    `

}); // end Vue bell_circle

}); // end document.ready

