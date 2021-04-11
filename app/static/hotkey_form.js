$(document).ready(function() {
    Vue.options.delimiters=["[[", "]]"];

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
        }},

        methods: {
            remove: function(key){
                this.$emit('remove', key);
            },
            
            add: function(){
                this.recording = true;
                Mousetrap.record((key) => {
                    this.$emit('remove', key.join(''));
                    this.$emit('add', this.func, key.join(''));
                    this.recording = false;
                });
            },
            defaults: function() {
                console.log('restored defaults')
            },
        },

        template:`
            <div class="row my-4">
                <div class="col-1">
                    <b>[[func]]:</b>
                </div>
                <div class="col">
                    <span class="btn btn-outline-secondary disable-hover py-0 mx-2"
                        v-for="key in keys">
                        [[key]]
                        <remove_button @remove="remove(key)"></remove_button>
                    </span>
                    <button class="btn btn-outline-primary btn-sm mx-2 py-0"
                          @click="add"
                          @blur="()=>this.recording=false"
                          >
                          [[ this.recording ? "Press any key" : "+" ]]
                    </button>
                </div>
                <div class="col-2">
                    <button class="btn btn-outline-primary btn-sm"
                        @click="defaults"
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
            rows: [ {f: "Foo", k: ["1","2"]}, {f: "Bar", k: ["space","shift+s"]}],

        },

        methods: {
            unbind: function(key) {
                this.rows.forEach((row) => {
                    const index = row.k.indexOf(key);
                    if (index > -1) {
                      row.k.splice(index, 1);
                    }
                });
            },

            bind: function(func, key){
                this.rows.forEach((row) => {
                    if (row.f === func) {
                        row.k.push(key);
                        return;
                    }
                });
            },
        },


        template:`
        <div id="form-container">
            <function_row v-for="row in rows"
                v-bind:func="row.f"
                v-bind:keys="row.k"
                @remove="(k)=>unbind(k)"
                @add="(f,k)=>bind(f,k)"
                ></function_row>
        </div>
        `


    });
});
