# Opal tool OCP app

> **Reference Implementation - Not Production Ready**
>
> This is a demonstration app designed to teach end-to-end Opal tool development on OCP. It is based on the Google Analytics 4 app but simplified for educational clarity. Do not use this app in production environments.

OCP template app that implements Opal tools. 

# Prerequisites 

1. [OCP developer account](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/get-started-with-the-ocp2-developer-platform)
2. Configured OCP development environment - check [out documentation](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/configure-your-development-environment-ocp2)

# What the template contains

1. Opal tool declaration - the template declares the Opal tool function in `app.yml`
2. Sample tool - the template contains a sample Opal tool - `todays_date` - check `src/tools/TodayDateTool.ts` file
3. Sample app settings - the template contains a sample app settings in `forms/settings.yml`. The tool uses these settings as default input parameters.

## SDK Documentation

This template uses the `@optimizely-opal/opal-tool-ocp-sdk` package. For detailed documentation on:

- `@tool` decorator API reference
- Parameter types (`String`, `Integer`, `Number`, `Boolean`, `List`, `Dictionary`)
- Authentication (`OptiIdAuthData` and custom OAuth providers)
- Error handling with `ToolError` (RFC 9457 compliant)
- `ToolFunction` vs `GlobalToolFunction`
- `ready()` method configuration
- Organizing tools in multiple files

See the [SDK documentation on npm](https://www.npmjs.com/package/@optimizely-opal/opal-tool-ocp-sdk).

# Before you start building...

## Register your app in OCP

Run `ocp app register` command to register your app in OCP. 

```shell
$ ocp app register
✔ The app id to reserve my_opal_tool
✔ The display name of the app My Opal tool
✔ Target product for the app Connect Platform - for developing an app for Optimizely holistic integration solution, Optimizely Connect Platform (OCP).
✔ Keep this app private and not share it with other developers in your organization? Yes
Registering app my_opal_tool in all shards
```

Notes: 
- pick a meaningful app id and display name for your app - app id can not contain spaces, use underscores instead
- select `Connect Platform` for target product
- select `No` for private app question if you want to share your app with other developers in your organization

## Validate your app

Run `ocp app validate` command in app folder to validate all settings.

# Build your Opal tools

## Test your app locally

Use OCP local env tool to test your app locally:
```bash
ocp dev
```

The command starts a local environment that hosts your app and opens a new tab in your browser. The UI let you test your app. 

## Add your own tool

To add your own tool: 
- create new file in `src/tools` folder
- add and export a class from the new file
- add a method to the class and decorate the method with `@tools` decorator. The method accepts tools parameters and auth data as input parameters and returns any object
- import the new file to `src/functions/OpalToolFunction.ts`

# Custom configuration and authorization

You can define custom settings (configuration) of your app. 
This allows OCP users that install to provide configuration properties defined by you. 

There are two main uses cases where this is useful: 

- authorization in external services - you can ask users who use your app to authorize in an external service, e.g. Google
- app behaviour customization - users can customize your app behaviour

Check [OCP documentation](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/forms-ocp2) for all features supported by OCP. 

## Storage

Your app can use 4 types of [storage](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/storage-ocp2):
- secrets store - suitable for sensitive information not related to a settings form
- settings store – data backing the settings form. Suitable for any configuration-related data (including passwords and API keys), especially data you need to present to the user through the settings form.
- key value store – General purpose storage for simple data structures, lists, and sets. Designed for high throughput and moderately large data sets when necessary, but limited to about 400 KB per record.
- shared key value store – Store and share common data between different components of your app.

Refer to the [docs](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/storage-ocp2) for more details. The sample app contains examples of using settings store and secret store. 

## Custom dependencies

You can add [your own dependencies](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/add-a-dependency-ocp2) to your app by using the npm install or yarn add command, or by manually editing the package.json file.

For example: 
```bash
npm install axios
```

## Logging and notifications

Use logger provided by `app-sdk` library to log important events in your app and support visibility and troubleshooting. 

Examples: 
```TypeScript
import { logger } from '@zaiusinc/app-sdk';

logger.info('Tool called with parameters:', this.request.bodyJSON.parameters);
logger.warn('Missing recommended parameter:', this.request.bodyJSON.parameters);
logger.debug('Extra debugging info:', this.request.bodyJSON.parameters);
```

You can access logs in two ways: 
- in UI - `Troubleshooting` tab in your app view in OCP App Directory
- via OCP CLI - with `ocp app logs` command, e.g. `ocp app logs --appId=<YOUR_APP_ID>` (check `ocp app logs --help` for more options)

By default, OCP logs in `INFO` level. You can temporairly change the level (e.g. for troubleshooting) using `ocp app set-log-level` command, e.g. `ocp app set-log-level <YOUR_APP_ID>@<YOUR_APP_VERSION> --trackerID=<PUBLIC_API_KEY_OF_YOUR_OCP_ACCOUNT>

You can also track significant activity through notifications in the Optimizely Connect Platform (OCP) [Activity Log](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/activity-log-notifications-ocp2) (a log of events available for OCP users in OCP UI in `Settings` -> `Activity log`). 

For example: 
```TypeScript
import {notifications} from '@zaiusinc/app-sdk';
notifications.success('Opal tool', 'Tool registered', 'App registered as an Opal tool');
```

## Overview and assets

Customise how your app is presented in App Directory by editing `directory/overview.md` file. The file is rendered to the app's Overview tab, which is presented when a user clicks through to your app from the OCP App Directory.

You can also privide your own icon for the app. To do this, replace `assets/logo.svg` file with your own icon. The icon is displayed on your app card in the OCP App Directory. The recommended size is 150 x 50 px.

# Test your Opal tool

To test your app with Opal, build your app and publish it to OCP: 
```bash
$ ocp app prepare --bump-dev-version --publish
```

> [!NOTE]
> `--bump-dev-version` option increases the version of your app in `app.yml` and lets you upgrade previously deployed versions. 

Then, install your app to your sandbox OCP account: 
```bash
$ ocp directory install <YOUR_APP_ID>@<YOUR_APP_VERSION> <PUBLIC_API_KEY> 
```

where:
- `<YOUR_APP_ID>` and `<YOUR_APP_VERSION>` are app id and version from `app.yml` manifest (both values can also be taken from the output of `ocp app prepare` command from previous step)
- <PUBLIC_API_KEY> - is the private API key of your sandbox OCP account. You can get the value from `Settings` -> `APIs` section in OCP UI (public API key before the first, before the dot, part of private API key) or from the output of `$ ocp accounts whoami` command

> [!NOTE]
> OCP auto-upgrades app versions according to semver order, so you need to install your app only once and it will be upgrades automatically after you deploy upgraded version

Got to your OCP account, `Data Setup -> App Directory` section, and find your app. In `Settings` tab, copy the value of `Opal Tool URL` property. 

Go to your Opal account, `Tools` -> `Registries` tab, and hit `Add tool registry` button. 

Pick `Registry Name`, use URL from `Opal Tool URL` of your app as `Discovery URL`. Leave `Bearer Token (Optional)` empty for now. Hit `Save`. 

Your tools should now be registered in Opal!

> [!NOTE]
> Every time you change tools manifest in your app and publish new version of your app, Opal needs to update tools configuration. To do this, hit `Sync` contextual menu option in Opal tools registry UI. 
