import json
import logging
import requests

def check_server_down(project):
    #ping the server and check the status
    r = requests.get(project['server'], timeout=timeOutTime)
    if r.status_code != 200:
        logging.error("Server down of project {} at {}".format(project['project_name'], datetime.now()))
        send_email_alert(project)
        if project['send_sms_alert']:
            send_sms_alert(project)
            play_alert()

def load_projects():
    f = open('projects.json')
    projects = json.load(f)
    for project in projects:
        check_server_down(project)

    f.close()

load_projects()