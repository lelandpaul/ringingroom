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

var socketio = io();

/////////
/* VUE */
/////////

Vue.options.delimiters = ['[[', ']]']; // make sure Vue doesn't interfere with jinja

// all vue objects needs to be defined within this block, so that the jinja templates are rendered first
$(document).ready(function() {

Vue.component("tower_row",{
    props:['tower','tab'],

    methods: {
        toggle_favorite: function(){
            socketio.emit('c_toggle_favorite',this.tower.tower_id);
            this.tower.favorite = !this.tower.favorite;
        }, 

        copy_id: function() {
 
            setTimeout(() => {$('.id_clipboard_tooltip').tooltip('hide')},1000);
                var dummy = document.createElement("textarea");
                document.body.appendChild(dummy);
                dummy.value = this.tower.tower_id;
                dummy.select();
                document.execCommand("copy");
                document.body.removeChild(dummy);
        },

        remove_recent: function(){
            socketio.emit('c_remove_recent',this.tower.tower_id);
            this.tower.recent=false;
        }
    },
    template:
    `
    <tr>
        <td class="align-baseline">
            <span @click="toggle_favorite" style="cursor: pointer;">
                <i class="fa-star"
                   :class="[tower.favorite ? 'fas':'far']">
                </i>
            </span>
        </td>
        <td class="align-baseline">
            <a :href="tower.tower_id + '/' + tower.tower_name">
                [[tower.tower_name]]
            </a>
        </td>
        <td class="align-text-bottom">
            [[tower.tower_id]]
            <button class="btn id_clipboard_tooltip align-baseline"
               data-toggle="tooltip"
               data-placement="bottom"
               data-container="body"
               data-trigger="click"
               @click="copy_id"
               title="Copied to clipboard">
                   <i class="far fa-clipboard fa-fw"></i>
            </button>
        </td>
        <td class="align-baseline">
            <a :href="'tower_settings/'+ tower.tower_id"
               class="btn btn-sm align-baseline"
               :class="[tower.creator ? 'btn-primary' : 'btn-outline-secondary disabled']"
               >
               Settings
            </a>
        </td>
        <td>
            <button v-if="tab == 'recent'"
                    @click="remove_recent"
                    class="btn btn-sm align-baseline btn-primary"
                    >
                    Remove
            </button>
        </td>
    </tr>
    `
});





my_towers = new Vue({
    el: "#my_towers",

    data: {

        towers: window.tower_rels,

    },

    mounted: function(){
        this.$nextTick(function(){
            // Javascript to enable link to tab
            var url = document.location.toString();
            if (url.match('#')) {
                $('#' + url.split('#')[1] + '_tab').tab('show');
            } 
            window.scrollTo(0, 0)
            $('[data-toggle="tooltip"]').tooltip();
        });
    },

    template:
    `
<div id="my_towers">
<ul class="nav nav-tabs" id="tower_relation_nav" role="tablist">
    <li class="nav-item" role="presentation">
        <a class="nav-link active" 
           id="created_tab" 
           data-toggle="tab" 
           href="#created" 
           role="tab"
           aria-controls="created"
           aria-selected="true">
            Created
        </a>
    </li>
    <li class="nav-item" role="presentation">
        <a class="nav-link" 
           id="recent_tab" 
           data-toggle="tab" 
           href="#recent" 
           role="tab"
           aria-controls="recent"
           aria-selected="true">
            Recent
        </a>
    </li>
    <li class="nav-item" role="presentation">
        <a class="nav-link" 
           id="favorite_tab" 
           data-toggle="tab" 
           href="#favorite" 
           role="tab"
           aria-controls="recent"
           aria-selected="true">
            Favorites
        </a>
    </li>
</ul>

<div class="tab-content" id="my_towers_content">

<div class="tab-pane fade show active" 
     id="created"
     role="tabpanel"
     aria-labelledby="created_tab">
    <table class="table table-hover">
        <thead>
            <tr>
                <th scope="col"></th>
                <th scope="col">Name</th>
                <th scope="col">ID</th>
                <th scope="col"></th>
            </tr>
        </thead>
        <tbody>
            <tower_row v-for="tower in towers"
                       v-if="tower.creator"
                       v-bind:tower="tower"
                       v-bind:tab="'created'"></tower_row>
        </tbody>
    </table>
</div>


<div class="tab-pane fade" 
     id="recent"
     role="tabpanel"
     aria-labelledby="recent_tab">
    <table class="table table-hover">
        <thead>
            <tr>
                <th scope="col"></th>
                <th scope="col">Name</th>
                <th scope="col">ID</th>
                <th scope="col"></th>
                <th scope="col"></th>
            </tr>
        </thead>
        <tbody>
            <tower_row v-for="tower in tower_rels"
                       v-if="tower.recent"
                       v-bind:tower="tower"
                       v-bind:tab="'recent'"></tower_row>
        </tbody>
    </table>
</div>


<div class="tab-pane fade" 
     id="favorite"
     role="tabpanel"
     aria-labelledby="favorite_tab">
    <table class="table table-hover">
        <thead>
            <tr>
                <th scope="col"></th>
                <th scope="col">Name</th>
                <th scope="col">ID</th>
                <th scope="col"></th>
            </tr>
        </thead>
        <tbody>
            <tower_row v-for="tower in tower_rels"
                       v-if="tower.favorite"
                       v-bind:tower="tower"
                       v-bind:tab="'favorite'"></tower_row>
        </tbody>
    </table>
</div>

</div>

</div>
</div>
`
});


}); // end document.ready


