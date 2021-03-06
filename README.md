<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/DecampsRenan/Slack-Meet-Generator">
    <img src="doc/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Google Meet Generator</h3>

  <p align="center">
    Generate Google Meet links from Slack !
    <br />
    <a href="https://github.com/DecampsRenan/Slack-Meet-Generator"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/DecampsRenan/Slack-Meet-Generator/issues/new?assignees=&labels=bug&template=bug_report.md">Report Bug</a>
    ·
    <a href="https://github.com/DecampsRenan/Slack-Meet-Generator/issues/new?assignees=&labels=enhancement&template=feature_request.md">Request Feature</a>
  </p>
</p>

This project uses your google account to create event in your calendar in order to get a meet link.

It's a bit hacky because there isn't Google Meet API, but it's been used in my company for more than 1 year at the time of writing this line !

![Demo](./doc/demo.gif)

## Installation

```shell
yarn install            # Install dev dependencies
cp .env.example .env    # Duplicate the env file and rename it to .env
```

You can already fill the `CALENDAR_EMAIL` with your google email account.

### Configure a new Google Cloud Platform project

1. Follow the step 1 here: https://developers.google.com/calendar/quickstart/nodejs. Make sure that you are logged with the google account you used to fill the `CALENDAR_EMAIL` env in the .env file.
2. When asked to "Configure your OAuth client", select "Web Server". Fill the callback url with `http://localhost`
3. Copy / paste the Client ID and Client Secret in the .env file
4. Run `yarn setup:credentials`. When asked for a google account, select the one used in the steps above.
5. You will probably have a screen with a warning about an app not approved; you can continue with that (because it's **your** app, I will not steel any data :p )
6. Accept all permissions
7. Paste the credentials json inside the CREDENTIAL key in the .env file
8. Now your server should be able to contact your calendar and create event !

### Configure Slack

1. Go to https://api.slack.com/apps, and click "Create New App"
2. Fill the name with what you want, and select the workspace in which you want to add the Meet Generator.
3. On the new page, in the "Add features and functionality" section, click on the "Slash Command" card
4. Click on "Create New Command"
5. Fill the informations with what you want, and make sure that the "Request URL" is the url of the server on which you have this project running, or at least an ngrok if you want to test it locally; append `/api/slack-handler` to this endpoint.
6. Check "Escape channels, users, etc...", and click "Save"
7. Go back to "Basic Information", and open the "Install your app" section.
8. Click on the "Install to Workspace" button to install it
9. Now you should be able to type `/meet` on every channel of your workspace !

## Running the app

```bash
# development
yarn start:dev

# Prod
yarn build
yarn start:prod
```
