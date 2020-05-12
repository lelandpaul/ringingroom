# This file helps with setup on the server

import os
from datetime import datetime
from re import sub

# compile sass
os.system("sass app/static/sass/ringing_room.scss app/static/css/ringing_room.css")
os.system("sass app/static/sass/static.scss app/static/css/static.css")

# prevent caching bad versions by updating requests

templates = ['app/templates/' + f for f in os.listdir('app/templates/') 
             if os.path.isfile(os.path.join('app/templates/', f))
             and f[-4:] == 'html' ]



time = datetime.now().strftime("%Y%m%d%H%M")

for file in templates:
    with open(file,'r') as f:
        f_lines = [line for line in f]
    with open(file,'w') as f:
        for line in f_lines:
            # new_line = sub(r'landing\.scss\.css(\?\d*)?',r'landing.scss.css\?'+time,line)
            # new_line = sub(r'style\.scss\.css(\?\d*)?',r'style.scss.css\?'+time,new_line)
            new_line = sub(r'\?nocache\d{12}',r'?nocache'+time,line)
            f.write(new_line)

    
    # os.system("mv " + file + " " + file + "-BCKP")
    # os.system(r"sed -E 's/landing.scss.css(\?\d*)?/landing.scss.css?" 
    #           + time + "/g' " + file + "-BCKP" + " > " + file)
    # os.system(r"sed -E 's/landing.js(\?\d*)?/landing.js?" 
    #           + time + "/g' " + file + "-BCKP" + " > " + file)
    # os.system(r"sed -E 's/style.scss.css(\?\d*)?/style.scss.css?" 
    #           + time + "/g' " + file + "-BCKP" + " > " + file)
    # os.system(r"sed -E 's/scripts.js(\?\d*)?/scripts.js?" 
    #           + time + "/g' " + file + "-BCKP" + " > " + file)


