$(document).ready(function () {
    Vue.options.delimiters = ["[[", "]]"];

    // Mapping object to contain function names & descriptions
    const function_names = {
        left: { id: 1, name: "Ring left hand", cat: "bell", desc: "" },
        right: { id: 2, name: "Ring right hand", cat: "bell", desc: "" },
        set_at_hand: {
            id: 3,
            name: "Set bells at hand",
            cat: "bell",
            desc: "",
        },
        bob: { id: 4, name: "Bob", cat: "call", desc: "" },
        single: { id: 5, name: "Single", cat: "call", desc: "" },
        go: { id: 6, name: "Go next", cat: "call", desc: "" },
        all: { id: 7, name: "That's all", cat: "call", desc: "" },
        stand: { id: 8, name: "Stand next", cat: "call", desc: "" },
        look: { id: 9, name: "Look to", cat: "call", desc: "" },
        rounds: { id: 10, name: "Rounds", cat: "call", desc: "" },
        change: { id: 11, name: "Change method", cat: "call", desc: "" },
        sorry: { id: 12, name: "Sorry", cat: "call", desc: "" },
        1: { id: 13, name: "Ring bell 1", cat: "adv", desc: "" },
        2: { id: 14, name: "Ring bell 2", cat: "adv", desc: "" },
        3: { id: 15, name: "Ring bell 3", cat: "adv", desc: "" },
        4: { id: 16, name: "Ring bell 4", cat: "adv", desc: "" },
        5: { id: 17, name: "Ring bell 5", cat: "adv", desc: "" },
        6: { id: 18, name: "Ring bell 6", cat: "adv", desc: "" },
        7: { id: 19, name: "Ring bell 7", cat: "adv", desc: "" },
        8: { id: 20, name: "Ring bell 8", cat: "adv", desc: "" },
        9: { id: 21, name: "Ring bell 9", cat: "adv", desc: "" },
        10: { id: 22, name: "Ring bell 10", cat: "adv", desc: "" },
        11: { id: 23, name: "Ring bell 11", cat: "adv", desc: "" },
        12: { id: 24, name: "Ring bell 12", cat: "adv", desc: "" },
        13: { id: 25, name: "Ring bell 13", cat: "adv", desc: "" },
        14: { id: 26, name: "Ring bell 14", cat: "adv", desc: "" },
        15: { id: 27, name: "Ring bell 15", cat: "adv", desc: "" },
        16: { id: 28, name: "Ring bell 16", cat: "adv", desc: "" },
        "rotate-1": { id: 29, name: "Rotate to 1", cat: "adv", desc: "" },
        "rotate-2": { id: 30, name: "Rotate to 2", cat: "adv", desc: "" },
        "rotate-3": { id: 31, name: "Rotate to 3", cat: "adv", desc: "" },
        "rotate-4": { id: 32, name: "Rotate to 4", cat: "adv", desc: "" },
        "rotate-5": { id: 33, name: "Rotate to 5", cat: "adv", desc: "" },
        "rotate-6": { id: 34, name: "Rotate to 6", cat: "adv", desc: "" },
        "rotate-7": { id: 35, name: "Rotate to 7", cat: "adv", desc: "" },
        "rotate-8": { id: 36, name: "Rotate to 8", cat: "adv", desc: "" },
        "rotate-9": { id: 37, name: "Rotate to 9", cat: "adv", desc: "" },
        "rotate-10": { id: 38, name: "Rotate to 10", cat: "adv", desc: "" },
        "rotate-11": { id: 39, name: "Rotate to 11", cat: "adv", desc: "" },
        "rotate-12": { id: 40, name: "Rotate to 12", cat: "adv", desc: "" },
        "rotate-13": { id: 41, name: "Rotate to 13", cat: "adv", desc: "" },
        "rotate-14": { id: 42, name: "Rotate to 14", cat: "adv", desc: "" },
        "rotate-15": { id: 43, name: "Rotate to 15", cat: "adv", desc: "" },
        "rotate-16": { id: 44, name: "Rotate to 16", cat: "adv", desc: "" },
        "catch-1": { id: 45, name: "Catch hold of 1", cat: "adv", desc: "" },
        "catch-2": { id: 46, name: "Catch hold of 2", cat: "adv", desc: "" },
        "catch-3": { id: 47, name: "Catch hold of 3", cat: "adv", desc: "" },
        "catch-4": { id: 48, name: "Catch hold of 4", cat: "adv", desc: "" },
        "catch-5": { id: 49, name: "Catch hold of 5", cat: "adv", desc: "" },
        "catch-6": { id: 50, name: "Catch hold of 6", cat: "adv", desc: "" },
        "catch-7": { id: 51, name: "Catch hold of 7", cat: "adv", desc: "" },
        "catch-8": { id: 52, name: "Catch hold of 8", cat: "adv", desc: "" },
        "catch-9": { id: 53, name: "Catch hold of 9", cat: "adv", desc: "" },
        "catch-10": { id: 54, name: "Catch hold of 10", cat: "adv", desc: "" },
        "catch-11": { id: 55, name: "Catch hold of 11", cat: "adv", desc: "" },
        "catch-12": { id: 56, name: "Catch hold of 12", cat: "adv", desc: "" },
        "catch-13": { id: 57, name: "Catch hold of 13", cat: "adv", desc: "" },
        "catch-14": { id: 58, name: "Catch hold of 14", cat: "adv", desc: "" },
        "catch-15": { id: 59, name: "Catch hold of 15", cat: "adv", desc: "" },
        "catch-16": { id: 60, name: "Catch hold of 16", cat: "adv", desc: "" },
        "flip-left": {
            id: 61,
            name: "Silently flip left",
            cat: "bell",
            desc: "",
        },
        "flip-right": {
            id: 62,
            name: "Silently flip right",
            cat: "bell",
            desc: "",
        },
        "overlay": { id: 63, name: "Toggle Mouse Mode", cat: "acc", desc: "" },
    };

    Vue.component("remove_button", {
        data: function () {
            return {
                hover: false,
            };
        },
        template: `
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

        data: function () {
            return {
                recording: false,
                function_names: function_names,
            };
        },

        methods: {
            remove: function (key) {
                this.$emit("remove", key);
            },

            add: function () {
                this.recording = true;
                Mousetrap.record((key) => {
                    this.$emit("add", this.func, key.join(""));
                    this.recording = false;
                });
            },
            reset: function () {
                this.$emit("reset", this.func);
            },
        },

        template: `
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
            bell_functions: function () {
                return this._filter_functions("bell");
            },
            call_functions: function () {
                return this._filter_functions("call");
            },
            acc_functions: function() {
                return this._filter_functions("acc");
            },
            adv_functions: function () {
                return this._filter_functions("adv");
            },
        },

        mounted: function () {
            $.ajax({
                url: "/api/user/keybindings",
                type: "GET",
                headers: {
                    Authorization: "Bearer " + window.user_token,
                },
                success: (response) => (this.rows = response),
            });
        },

        methods: {
            _filter_functions: function (cat) {
                return Object.keys(this.function_names)
                    .filter((func) => {
                        return this.function_names[func].cat === cat;
                    })
                    .sort((func_a, func_b) => {
                        console.log(
                            "sorting: ",
                            this.function_names[func_a],
                            this.function_names[func_b],
                            this.function_names[func_a].id <
                                this.function_names[func_b].id
                        );
                        return (
                            this.function_names[func_a].id >
                            this.function_names[func_b].id
                        );
                    });
            },

            unbind: function (key) {
                for (const func in this.rows) {
                    const index = this.rows[func].indexOf(key);
                    if (index > -1) {
                        this.rows[func].splice(index, 1);
                        if (this.rows[func].length == 0) {
                            this.alert_text =
                                "You just removed or overwrote the only keybinding for '<b>" +
                                function_names[func].name +
                                "</b>'. You won't be able to use that function from the keyboard unless you add a new keybinding.";
                            setTimeout(() => (this.alert_text = null), 5000);
                        }
                        return this.update(func);
                    }
                }
                return $.Deferred().resolve().promise();
            },

            bind: function (func, key) {
                this.unbind(key).then(() => {
                    this.rows[func].push(key);
                    this.update(func);
                });
            },

            update: function (func) {
                var data = {};
                data[func] = this.rows[func];
                return $.ajax({
                    url: "/api/user/keybindings",
                    type: "POST",
                    data: JSON.stringify(data),
                    headers: {
                        Authorization: "Bearer " + window.user_token,
                    },
                    contentType: "application/json",
                });
            },

            reset: function (func) {
                return $.ajax({
                    url: "/api/user/keybindings",
                    type: "DELETE",
                    data: JSON.stringify({ to_reset: func }),
                    contentType: "application/json",
                    headers: {
                        Authorization: "Bearer " + window.user_token,
                    },
                    success: (result) => (this.rows = result),
                });
            },
        },

        template: `
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
            <div id="keybinds_accessibility">
                <h3>Accessibility</h3>
                <function_row v-for="func in acc_functions"
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
        `,
    });

    const controllers_form = new Vue({
        el: "#controllers_form",

        data: {
            cur_values: {},
            options: [
                { call: "Bob" },
                { call: "Change method" },
                { call: "Go" },
                { call: "Look to" },
                { call: "Rounds" },
                { call: "Single" },
                { call: "Sorry" },
                { call: "Stand next" },
                { call: "That's all" },
                { call: "Silently flip stroke" },
                { call: "(none)" },
            ],
        },

        mounted: function () {
            $.ajax({
                url: "/api/user/controllers",
                type: "GET",
                headers: {
                    Authorization: "Bearer " + window.user_token,
                },
                success: (response) => (this.cur_values = response),
            });
        },

        methods: {
            update: function (param) {
                var data = {};
                data[param] = this.cur_values[param];
                return $.ajax({
                    url: "/api/user/controllers",
                    type: "POST",
                    data: JSON.stringify(data),
                    headers: {
                        Authorization: "Bearer " + window.user_token,
                    },
                    contentType: "application/json",
                });
            },

            reset: function (func) {
                return $.ajax({
                    url: "/api/user/controllers",
                    type: "DELETE",
                    headers: {
                        Authorization: "Bearer " + window.user_token,
                    },
                    success: (result) => (this.cur_values = result),
                });
            },
        },

        template: `
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
                        <small>The point at which a handstroke is detected. (Higher numbers indicate a more vertical bell.)</small>
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
                        <small>The point at which a backstroke is detected. (Higher numbers indicate a more vertical bell.)</small>
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
