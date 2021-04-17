$(document).ready(function() {
    Vue.options.delimiters=["[[", "]]"];

    // Mapping object to contain function names & descriptions
    const function_names = {
        left:        { name: 'Ring left hand'    , cat: 'bell', desc: '' },
        right:       { name: 'Ring right hand'   , cat: 'bell', desc: '' },
        set_at_hand: { name: 'Set bells at hand' , cat: 'bell', desc: '' },
        bob:         { name: 'Bob'               , cat: 'call', desc: '' },
        single:      { name: 'Single'            , cat: 'call', desc: '' },
        go:          { name: 'Go next'           , cat: 'call', desc: '' },
        all:         { name: "That's all"        , cat: 'call', desc: '' },
        stand:       { name: "Stand next"        , cat: 'call', desc: '' },
        look:        { name: "Look to"           , cat: 'call', desc: '' },
        rounds:      { name: "Rounds"            , cat: 'call', desc: '' },
        change:      { name: "Change method"     , cat: 'call', desc: '' },
        sorry:       { name: "Sorry"             , cat: 'call', desc: '' },
        '1':         { name: '1'                 , cat: 'adv', desc: '' },
        '2':         { name: '2'                 , cat: 'adv', desc: '' },
        '3':         { name: '3'                 , cat: 'adv', desc: '' },
        '4':         { name: '4'                 , cat: 'adv', desc: '' },
        '5':         { name: '5'                 , cat: 'adv', desc: '' },
        '6':         { name: '6'                 , cat: 'adv', desc: '' },
        '7':         { name: '7'                 , cat: 'adv', desc: '' },
        '8':         { name: '8'                 , cat: 'adv', desc: '' },
        '9':         { name: '9'                 , cat: 'adv', desc: '' },
        '10':        { name: '10'                , cat: 'adv', desc: '' },
        '11':        { name: '11'                , cat: 'adv', desc: '' },
        '12':        { name: '12'                , cat: 'adv', desc: '' },
        '13':        { name: '13'                , cat: 'adv', desc: '' },
        '14':        { name: '14'                , cat: 'adv', desc: '' },
        '15':        { name: '15'                , cat: 'adv', desc: '' },
        '16':        { name: '16'                , cat: 'adv', desc: '' },
        'rotate-1':  { name: 'Rotate to 1'       , cat: 'adv', desc: '' },
        'rotate-2':  { name: 'Rotate to 2'       , cat: 'adv', desc: '' },
        'rotate-3':  { name: 'Rotate to 3'       , cat: 'adv', desc: '' },
        'rotate-4':  { name: 'Rotate to 4'       , cat: 'adv', desc: '' },
        'rotate-5':  { name: 'Rotate to 5'       , cat: 'adv', desc: '' },
        'rotate-6':  { name: 'Rotate to 6'       , cat: 'adv', desc: '' },
        'rotate-7':  { name: 'Rotate to 7'       , cat: 'adv', desc: '' },
        'rotate-8':  { name: 'Rotate to 8'       , cat: 'adv', desc: '' },
        'rotate-9':  { name: 'Rotate to 9'       , cat: 'adv', desc: '' },
        'rotate-10': { name: 'Rotate to 10'      , cat: 'adv', desc: '' },
        'rotate-11': { name: 'Rotate to 11'      , cat: 'adv', desc: '' },
        'rotate-12': { name: 'Rotate to 12'      , cat: 'adv', desc: '' },
        'rotate-13': { name: 'Rotate to 13'      , cat: 'adv', desc: '' },
        'rotate-14': { name: 'Rotate to 14'      , cat: 'adv', desc: '' },
        'rotate-15': { name: 'Rotate to 15'      , cat: 'adv', desc: '' },
        'rotate-16': { name: 'Rotate to 16'      , cat: 'adv', desc: '' },
        'assign-1':  { name: 'Assign self to 1'  , cat: 'adv', desc: '' },
        'assign-2':  { name: 'Assign self to 2'  , cat: 'adv', desc: '' },
        'assign-3':  { name: 'Assign self to 3'  , cat: 'adv', desc: '' },
        'assign-4':  { name: 'Assign self to 4'  , cat: 'adv', desc: '' },
        'assign-5':  { name: 'Assign self to 5'  , cat: 'adv', desc: '' },
        'assign-6':  { name: 'Assign self to 6'  , cat: 'adv', desc: '' },
        'assign-7':  { name: 'Assign self to 7'  , cat: 'adv', desc: '' },
        'assign-8':  { name: 'Assign self to 8'  , cat: 'adv', desc: '' },
        'assign-9':  { name: 'Assign self to 9'  , cat: 'adv', desc: '' },
        'assign-10': { name: 'Assign self to 10' , cat: 'adv', desc: '' },
        'assign-11': { name: 'Assign self to 11' , cat: 'adv', desc: '' },
        'assign-12': { name: 'Assign self to 12' , cat: 'adv', desc: '' },
        'assign-13': { name: 'Assign self to 13' , cat: 'adv', desc: '' },
        'assign-14': { name: 'Assign self to 14' , cat: 'adv', desc: '' },
        'assign-15': { name: 'Assign self to 15' , cat: 'adv', desc: '' },
        'assign-16': { name: 'Assign self to 16' , cat: 'adv', desc: '' },
    };

    Vue.component("remove_button", {
        data: function() { return {
            hover: false,
        }},
        template:`
            <i class="fa-window-close p-0 m-0 ml-2 clickable"
                :class="[hover ? 'fas' : 'far']"
                @mouseover="hover=true"
                @mouseleave="hover=false"
                @click="$emit('remove')"
            ></i>

        `,
    });

    Vue.component("function_row", {
        props: ["func", "keys"],

        data: function() { return {
            recording: false,
            function_names: function_names,
        }},

        methods: {
            remove: function(key){
                this.$emit('remove', key);
            },
            
            add: function(){
                this.recording = true;
                Mousetrap.record((key) => {
                    this.$emit('add', this.func, key.join(''));
                    this.recording = false;
                });
            },
            reset: function() {
                this.$emit('reset', this.func);
            },
        },

        template:`
            <div class="row my-4">
                <div class="col-3">
                    [[ function_names[func].name ]]:
                </div>
                <div class="col">
                    <span class="btn btn-outline-secondary disable-hover py-0 mx-2"
                        v-for="key in keys">
                        [[key]]
                        <remove_button @remove="remove(key)"></remove_button>
                    </span>
                    <span class="btn p-0 border-0" style="width: 0 !important;">
                        <!-- Empty span makes sure that the + button stays vertically centered
                        <!-- Even when it's the only content in the col.
                        <!-- If I were better at CSS this probably wouldn't be necessary. -->
                    </span>
                    <button class="btn btn-sm py-0"
                          :class="[this.recording ? 'btn-primary' : 'btn-outline-primary']"
                          @click="add"
                          @blur="()=>this.recording=false"
                          >
                          [[ this.recording ? "Press any key" : "+" ]]
                    </button>
                </div>
                <div class="col-2">
                    <button class="btn btn-outline-primary btn-sm"
                        @click="reset"
                        >
                        Restore defaults
                    </button>
                </div>
            </div>
        `,
    });


    const keyboard_form = new Vue({
        el: "#keyboard_form",

        data: {
            rows: {},
            function_names: function_names,
            advanced_visible: false,
            alert_text: null,

        },

        computed: {
            bell_functions: function(){
                return this._filter_functions('bell');
            },
            call_functions: function(){
                return this._filter_functions('call');
            },
            adv_functions: function(){
                return this._filter_functions('adv');
            },
        },

        mounted: function() {
            $.ajax({
                url: '/api/user/keybindings',
                type: 'GET',
                headers: {
                    "Authorization": "Bearer " + window.user_token,
                },
                success: (response) => this.rows = response,
            });
        },

        methods: {
            _filter_functions: function(cat){
                return Object.keys(this.function_names)
                        .filter((func)=>{
                            return this.function_names[func].cat === cat;
                        }).sort((func_a, func_b)=>{
                            const name_a = this.function_names[func_a].name;
                            const name_b = this.function_names[func_b].name;
                            const int_a = parseInt(name_a.slice(-2));
                            const int_b = parseInt(name_b.slice(-2));
                            if (Number.isNaN(int_a) || Number.isNaN(int_b)) {
                                return name_a < name_b;
                            }
                            return int_a < int_b;
                        });
            },
            unbind: function(key) {
                for (const func in this.rows) {
                    const index = this.rows[func].indexOf(key);
                    if (index > -1) {
                        this.rows[func].splice(index, 1);
                        if (this.rows[func].length == 0) {
                            this.alert_text = "You just removed or overwrote the only keybinding for '<b>" + function_names[func].name + "</b>'. You won't be able to use that function from the keyboard unless you add a new keybinding.";
                        }
                        return this.update(func)
                    }
                }
                return $.Deferred().resolve().promise();
            },

            bind: function(func, key){
                this.unbind(key).then(()=>{
                    this.rows[func].push(key)
                    this.update(func)
                });
            },

            update: function(func) {
                var data = {};
                data[func] = this.rows[func];
                return $.ajax({
                    url: '/api/user/keybindings',
                    type: 'POST',
                    data: JSON.stringify(data),
                    headers: {
                        "Authorization": "Bearer " + window.user_token,
                    },
                    contentType: 'application/json',
                });
            },

            reset: function(func) {
                return $.ajax({
                    url: '/api/user/keybindings',
                    type: 'DELETE',
                    data: JSON.stringify({'to_reset': func}),
                    contentType: 'application/json',
                    headers: {
                        "Authorization": "Bearer " + window.user_token,
                    },
                    success: (result)=>this.rows=result,
                });
            },
        },


        template:`
        <div id="keyboard-form-container" class="py-3">
            <div class="row py-3">
                <div class="col-10">
                    <small> 
                        You can modify what hotkeys trigger which actions in the tower. 
                        To add a hotkey, press the "+" button next to the action, then press the key 
                        you want to use.
                        (You can press a key combination like "control+x" as well.)
                        To remove a hotkey, press the "X" button next to that key. 
                        Each hotkey can only be used for one function, but you can assign as many
                        hotkeys to each function as you want.
                    </small>
                </div>
                <div class="col-2 d-flex flex-row-reverse align-items-center">
                    <button class="btn btn-outline-primary btn-sm"
                        style="height: min-content;"
                        @click="()=>reset('ALL_KEYBINDINGS')"
                        >
                        Restore all to default settings
                    </button>
                </div>
            </div>
            <div class="alert alert-primary alert-dismissible fade show" role="alert"
                 v-if="alert_text">
                <span v-html="alert_text"></span>
                  <button type="button" class="close mt-2" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
            </div>
            <div id="keybinds_ringing">
                <h3>Ringing</h3>
                <function_row v-for="func in bell_functions"
                    v-bind:func="func"
                    v-bind:keys="rows[func]"
                    @remove="(k)=>unbind(k)"
                    @add="(f,k)=>bind(f,k)"
                    @reset="(f)=>reset(f)"
                    ></function_row>
            </div>
            <div id="keybinds_calls">
                <h3>Calls</h3>
                <function_row v-for="func in call_functions"
                    v-bind:func="func"
                    v-bind:keys="rows[func]"
                    @remove="(k)=>unbind(k)"
                    @add="(f,k)=>bind(f,k)"
                    @reset="(f)=>reset(f)"
                    ></function_row>
            </div>
            <div id="keybinds_advanced" class="collapse">
                <h3>Advanced</h3>
                <function_row v-for="func in adv_functions"
                    v-bind:func="func"
                    v-bind:keys="rows[func]"
                    @remove="(k)=>unbind(k)"
                    @add="(f,k)=>bind(f,k)"
                    @reset="(f)=>reset(f)"
                    ></function_row>
            </div>
            <a class="btn btn-sm btn-outline-primary"
            href="#keybinds_advanced" data-toggle="collapse" role="button" aria-expand="false" aria-controls="keybinds_avanced"
            @click="advanced_visible=!advanced_visible"
            >
            [[advanced_visible ? 'Hide Advanced' : 'Show advanced' ]]
            </a>
        </div>
        `
    });

    const controllers_form = new Vue({
        el: "#controllers_form",

        data: {
            cur_values: {},
            options: [
                { call: 'Bob' },
                { call: 'Change method' },
                { call: 'Go' },
                { call: 'Look to' },
                { call: 'Rounds' },
                { call: 'Single' },
                { call: 'Sorry' },
                { call: 'Stand' },
                { call: "That's all" },
            ]
        },

        mounted: function() {
            $.ajax({
                url: '/api/user/controllers',
                type: 'GET',
                headers: {
                    "Authorization": "Bearer " + window.user_token,
                },
                success: (response) => this.cur_values = response,
            });
        },

        methods: {
            update: function(param) {
                var data = {};
                data[param] = this.cur_values[param];
                return $.ajax({
                    url: '/api/user/controllers',
                    type: 'POST',
                    data: JSON.stringify(data),
                    headers: {
                        "Authorization": "Bearer " + window.user_token,
                    },
                    contentType: 'application/json',
                });
            },

            reset: function(func) {
                return $.ajax({
                    url: '/api/user/controllers',
                    type: 'DELETE',
                    headers: {
                        "Authorization": "Bearer " + window.user_token,
                    },
                    success: (result)=>this.cur_values=result,
                });
            },
        },

        template:`
            <div id="controllers-form-container" class="py-2">
            <div class="row py-3">
                <div class="col-10">
                    <small> 
                        These parameters control the behavior of motion controllers such as eBells or  
                        ActionXLs.
                    </small>
                </div>
                <div class="col-2 d-flex flex-row-reverse align-items-center">
                    <button class="btn btn-outline-primary btn-sm"
                        style="height: min-content;"
                        @click="reset"
                        >
                        Restore all to default settings
                    </button>
                </div>
            </div>
                <h4 class="pt-3">Strike settings</h4>
                <div class="form-group row justify-content-between">
                    <label for="debounce" class="col col-sm-4 col-form-label">
                        Debounce
                    </label>
                    <div class="col col-sm-2 d-flex align-items-center">
                        <input id="debounce" class="form-control" type="number" 
                               min="0"
                               step="10"
                               @change="update('debounce')"
                               v-model:value="cur_values.debounce"/>
                    </div>
                </div>
                <div class="row mt-n3 mb-3">
                    <div class="col-12 col-sm-auto">
                        <small>How many milliseconds must pass between one stroke and the next.</small>
                    </div>
                </div>
                <div class="form-group row justify-content-between">
                    <label for="handstroke" class="col col-sm-4 col-form-label">
                        Handstroke
                    </label>
                    <div class="col col-sm-2 d-flex align-items-center">
                        <input id="handstroke" class="form-control" type="number" 
                               step="10"
                               @change="update('handstroke')"
                               v-model:value="cur_values.handstroke"/>
                    </div>
                </div>
                <div class="row mt-n3 mb-3">
                    <div class="col-12 col-sm-auto">
                        <small>The angle at which a handstroke is detected. (Higher numbers indicate a more vertical bell.)</small>
                    </div>
                </div>
                <div class="form-group row justify-content-between">
                    <label for="backstroke" class="col col-sm-4 col-form-label">
                        Backstroke
                    </label>
                    <div class="col col-sm-2 d-flex align-items-center">
                        <input id="backstroke" class="form-control" type="number" 
                               step="10"
                               @change="update('backstroke')"
                               v-model:value="cur_values.backstroke"/>
                    </div>
                </div>
                <div class="row mt-n3 mb-3">
                    <div class="col-12 col-sm-auto">
                        <small>The angle at which a backstroke is detected. (Higher numbers indicate a more vertical bell.)</small>
                    </div>
                </div>
                <h4 class="pt-3"> Left controller buttons </h4>
                <div class="form-group row">
                    <label for="left_left" class="col-6 col-sm-1 col-form-label">
                        Left
                    </label>
                    <div class="col col-sm-3 d-flex align-items-center">
                        <select id="left_left" class="form-control"
                            @change="update('left_left')"
                            v-model="cur_values.left_left">
                            <option v-for="option in options" v-bind:value="option.call">
                                [[ option.call ]]
                            </option>
                        </select>
                    </div>
                    <label for="left_right" class="col-6 col-sm-1 offset-sm-4 col-form-label">
                        Right
                    </label>
                    <div class="col col-sm-3 d-flex align-items-center">
                        <select id="left_right" class="form-control"
                            @change="update('left_right')"
                            v-model="cur_values.left_right">
                            <option v-for="option in options" v-bind:value="option.call">
                                [[ option.call ]]
                            </option>
                        </select>
                    </div>
                </div>
                <h4 class="pt-3"> Right controller buttons </h4>
                <div class="form-group row">
                    <label for="right_left" class="col-6 col-sm-1 col-form-label">
                        Left
                    </label>
                    <div class="col-6 col-sm-3 d-flex align-items-center">
                        <select id="right_left" class="form-control"
                            @change="update('right_left')"
                            v-model="cur_values.right_left">
                            <option v-for="option in options" v-bind:value="option.call">
                                [[ option.call ]]
                            </option>
                        </select>
                    </div>
                    <label for="right_right" class="col-6 col-sm-1 offset-sm-4 col-form-label">
                        Right
                    </label>
                    <div class="col col-sm-3 d-flex align-items-center">
                        <select id="right_right" class="form-control"
                            @change="update('right_right')"
                            v-model="cur_values.right_right">
                            <option v-for="option in options" v-bind:value="option.call">
                                [[ option.call ]]
                            </option>
                        </select>
                    </div>
                </div>
            </div>
        `,
    });
});
