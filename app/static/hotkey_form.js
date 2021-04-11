$(document).ready(function() {
    Vue.options.delimiters=["[[", "]]"];

    // Mapping object to contain function names & descriptions
    const function_names = {
        left: {name: 'Ring left hand', desc: ''},
        right: {name: 'Ring right hand', desc: ''},
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
                    <b>[[ function_names[func].name ]]:</b>
                </div>
                <div class="col">
                    <span class="btn btn-outline-secondary disable-hover py-0 mx-2"
                        v-for="key in keys">
                        [[key]]
                        <remove_button @remove="remove(key)"></remove_button>
                    </span>
                    <button class="btn btn-sm mx-2 py-0"
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


    var form = new Vue({
        el: "#keyboard_form",

        data: {
            rows: {},

        },

        mounted: function() {
            $.ajax({
                url: '/api/user/keybindings',
                type: 'GET',
                success: (response) => this.rows = response,
            });
        },

        methods: {
            unbind: function(key) {
                for (const func in this.rows) {
                    const index = this.rows[func].indexOf(key);
                    if (index > -1) {
                        this.rows[func].splice(index, 1);
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
                    contentType: 'application/json',
                });
            },

            reset: function(func) {
                return $.ajax({
                    url: '/api/user/keybindings',
                    type: 'DELETE',
                    data: JSON.stringify({'to_reset': func}),
                    contentType: 'application/json',
                    success: (result)=>this.rows=result,
                });
            },
        },


        template:`
        <div id="form-container">
            <function_row v-for="(keys, func) in rows"
                v-bind:func="func"
                v-bind:keys="keys"
                @remove="(k)=>unbind(k)"
                @add="(f,k)=>bind(f,k)"
                @reset="(f)=>reset(f)"
                ></function_row>
        </div>
        `


    });
});
