"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../../slack");

class CloudWatchParser {

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {
			if (!_.has(message, "AlarmName") || !_.has(message, "AlarmDescription")) {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			// CloudWatch Alarm
			const accountId = message.AWSAccountId;
			const alarmName = message.AlarmName;
			// const description = message.AlarmDescription;
			const oldState = message.OldStateValue;
			const newState = message.NewStateValue;
			const reason = message.NewStateReason;
			const region = message.Region;
			const time = message.StateChangeTime;

			let color = Slack.COLORS.neutral;
			switch(newState) {
			case "OK":
				color = Slack.COLORS.ok;
				break;
			case "ALARM":
				color = Slack.COLORS.critical;
				break;
			case "INSUFFICIENT_DATA":
				color = Slack.COLORS.warning;
				break;
			}

			const fields = [];

			if (process.env.SERVICE_NAME) {
				fields.push({
					title: "Service",
					value: process.env.SERVICE_NAME,
					short: true
				});
			} else {
				fields.push({
					title: "Account ID",
					value: accountId,
					short: true
				});
			}

			fields.push({
				title: "Region",
				value: region,
				short: true
			});
			
			fields.push({
				title: "Old State",
				value: oldState,
				short: true
			});
			
			fields.push({
				title: "New State",
				value: newState,
				short: true
			});

			const slackMessage = {
				attachments: [{
					fallback: `${alarmName} state is now ${newState}:\n${reason}`,
					color: color,
					author_name: "Amazon CloudWatch Alarm",
					title: alarmName,
					text: reason,
					fields: fields,
					ts: Slack.toEpochTime(new Date(time))
				}]
			};

			return slackMessage;
		});
	}
}

module.exports = CloudWatchParser;
