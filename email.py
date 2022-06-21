import smtplib

smtpEmail = "bryanwi09@gmail.com"
smtpPassword = "SMTPPassword"
emailFrom = "bryanwi09@gmail.com"

def send_email_alert(project):
    conn = smtplib.SMTP('smtp.gmail.com', 587)
    #create a new SMTP connection
    conn.ehlo()
    conn.starttls()
    conn.login(smtpEmail, smtpPassword)

    projectName = project['project_name']
    subject = '{} server is down'.format(projectName)

    manager = project['manager']
    lead = project['lead']

    projectMembers = project['other_members']
    membersNames = ', '.join(map(str,list(map(lambda x: x['name'], projectMembers))))
    message = """The {} project server seems to be down. Please contact team to fix

    Team members:
    Project Manager: {}
    Mobile Number: {}

    Team Lead: {}
    Mobile Number: {}

    Other Members:
    {}
    """.format(projectName, manager['name'],manager['number'], lead['name'], lead['number'],membersNames)

    emailTo = list(map(lambda x: x['email'], projectMembers))
    emailTo.insert(0, lead['email'])
    emailTo.insert(0, manager['email'])
    emailMessage = 'Subject: {}\n\n{}'.format(subject, message)

    conn.sendmail(emailFrom,emailTo,emailMessage) #sends email
    conn.quit() # closes the connection
