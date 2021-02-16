/* eslint-disable */
import {
  Controller, Get, Post, Body, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { SlackRequestDto } from './dto/SlackRequestDTO';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/api/ping')
  getHello() {
    return this.appService.getHello();
  }

  @Post('/api/slack-handler')
  async handleSlackRequest(
    @Body() slackRequest: SlackRequestDto,
    @Res() response: Response,
  ): Promise<void> {
    const {
      response_url: responseUrl,
      user_id: userId,
      text,
      ssl_check: sslCheck,
    } = slackRequest;
    console.log({ responseUrl, userId, text });

    if (sslCheck) {
      return response.status(200).end();
    }

    response.status(200).end();

    this.appService.createRoom(responseUrl, userId, text);
  }
}
