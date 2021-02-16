/* eslint-disable no-unused-vars */
import { Injectable } from '@nestjs/common';
import * as superagent from 'superagent';
import { google, calendar_v3 as calendarV3 } from 'googleapis';
import * as dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  calendar: calendarV3.Calendar

  constructor(
    private configService: ConfigService,
  ) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('CLIENT_ID'),
      this.configService.get<string>('CLIENT_SECRET'),
    );

    try {
      const credentials = JSON.parse(this.configService.get<string>('CREDENTIALS'));
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      throw new Error('Cannot load google credentials JSON. Make sure the JSON is well formatted');
    }

    this.calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  async wait(milliseconds = 1000) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  getHello() {
    return {
      version: '1.0.0',
      name: 'Meet Generator',
    };
  }

  async getMeetLink(
    calendarData,
    responseUrl: string,
  ): Promise<any> {
    for (let i = 0; i < 3; i += 1) {
      if (i === 1) {
        const slackAnswer = {
          response_type: 'ephemeral',
          replace_original: true,
          text: ':face_with_monocle: Generation is longer than usual, keep waiting while we try to get the link...',
        };
        superagent
          .post(responseUrl)
          .send(slackAnswer)
          .end();
      }

      // eslint-disable-next-line no-await-in-loop
      const data = await this.calendar.events.get({
        eventId: calendarData.id,
        calendarId: this.configService.get<string>('CALENDAR_ID'),
      });

      this.sendDebugMessageToSlack('[getCalendarData::deleteEvent] Failure, can\'t delete event', data);

      if (data.data.hangoutLink) {
        return data.data.hangoutLink;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.wait(3000);
    }
    return null;
  }

  async getCalendarData(): Promise<any> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: this.configService.get<string>('CALENDAR_ID'),
        sendUpdates: 'none',
        conferenceDataVersion: 1,
        requestBody: {
          start: {
            dateTime: dayjs().toISOString(),
            timeZone: 'Europe/Paris',
          },
          end: {
            dateTime: dayjs().add(30, 'minute').toISOString(),
            timeZone: 'Europe/Paris',
          },
          attendees: [{ email: this.configService.get<string>('CALENDAR_EMAIL') }],
          conferenceData: {
            createRequest: {
              requestId: uuid(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      });
      this.calendar.events.delete({ calendarId: 'primary', eventId: response.data.id })
        .then(() => console.log('[getCalendarData::deleteEvent] Success, event deleted'))
        .catch((error) => {
          console.error('[getCalendarData::deleteEvent] Failure, can\'t delete event', error);
          this.sendDebugMessageToSlack('[getCalendarData::deleteEvent] Failure, can\'t delete event', error);
        });

      return [null, response];
    } catch (error) {
      this.sendDebugMessageToSlack('[getCalendarData::deleteEvent] Event creation error', error);
      console.error('[getCalendarData::deleteEvent] Event creation error', error);
      return [error, null];
    }
  }

  sendDebugMessageToSlack(title, params): void {
    const slackWebHook = this.configService.get<string>('SLACK_DEBUG_HOOK');
    const messageBody = `${title}\n\`\`\`\n${JSON.stringify(params, null, 2)}\n\`\`\``;
    if (!slackWebHook) {
      console.info("It seems you haven't defined a SLACK_DEBUG_HOOK environnement variable. Create a slack hook and set it to be able to have debug messages in a custom slack channel.");
      console.error('[sendDebugMessageToSlack] Something happens', messageBody);
      return;
    }
    superagent
      .post(slackWebHook)
      .send({ text: messageBody })
      .end();
  }

  async createRoom(
    responseUrl: string,
    userId: string,
    text: string,
  ): Promise<void> {
    const feedbackMessage = {
      response_type: 'ephemeral',
      text: '*Link generation...*',
    };

    await superagent
      .post(responseUrl)
      .send(feedbackMessage);

    let data = null;
    let slackAnswer = null;

    const [calendarError, calendar] = await this.getCalendarData();
    if (calendarError) {
      console.error('[createRoom::this.getCalendarData()] Cannot generate link', { calendarError });
      this.sendDebugMessageToSlack('[createRoom::this.getCalendarData()] Cannot generate link', { calendarError, calendarData: calendar?.data });
      slackAnswer = {
        response_type: 'ephemeral',
        replace_original: true,
        text: 'Oh :confused: It seems that google do not want to give us a meet link, maybe try again later ?',
      };
      superagent
        .post(responseUrl)
        .send(slackAnswer)
        .end();

      return;
    }

    data = calendar.data;
    console.log('[createRoom::this.getCalendarData()] Got following result', data);

    let meetLink = data?.hangoutLink;
    if (!meetLink) {
      meetLink = await this.getMeetLink(calendar.data, responseUrl);
    }

    if (!meetLink) {
      console.error('[createRoom::this.getMeetLink()] Cannot get the link after trying 3 times');
      this.sendDebugMessageToSlack('[createRoom::this.getMeetLink()] Cannot get the link after trying 3 times', { calendarData: data });
      slackAnswer = {
        response_type: 'ephemeral',
        replace_original: true,
        text: "After trying three times asking to get the link, we can't get it :slightly_frowning_face:\nPlease retry in few minutes :smiley:",
      };
      superagent
        .post(responseUrl)
        .send(slackAnswer)
        .end();

      return;
    }

    const responseBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<@${userId}> just created a meet* :tada: ${text ?? ''}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:point_right: ${meetLink}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Access with other connected Google accounts <${meetLink}?authuser=0|:zero:> <${meetLink}?authuser=1|:one:> <${meetLink}?authuser=2|:two:> <${meetLink}?authuser=3|:three:>`,
          },
        ],
      },
    ];

    slackAnswer = {
      response_type: 'in_channel',
      replace_original: true,
      blocks: responseBlocks,
    };

    superagent
      .post(responseUrl)
      .send(slackAnswer)
      .end();
  }
}
