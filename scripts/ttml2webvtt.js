(function($) {
	AblePlayer.prototype.computeEndTime = function(startTime, durationTime) {
		var SECONDS = 0;
		var MINUTES = 1;
		var HOURS = 2;

		var startParts = startTime
			.split(':')
			.reverse()
			.map(function(value) {
				return parseFloat(value);
			});

		var durationParts = durationTime
			.split(':')
			.reverse()
			.map(function(value) {
				return parseFloat(value);
			});

		var endTime = startParts
			.reduce(function(acc, val, index) {
				var sum = val + durationParts[index];

				if (index === SECONDS) {
					if (sum > 60) {
						durationParts[index + 1] += 1;
						sum -= 60;
					}

					sum = sum.toFixed(3);
				}

				if (index === MINUTES) {
					if (sum > 60) {
						durationParts[index + 1] += 1;
						sum -= 60;
					}
				}

				if (sum < 10) {
					sum = '0' + sum;
				}

				acc.push(sum);

				return acc;
			}, [])
			.reverse()
			.join(':');

		return endTime;
	};

	AblePlayer.prototype.ttml2webvtt = function(contents) {
		var thisObj = this;

		var xml = thisObj.convert.xml2json(contents, {
			ignoreComment: true,
			alwaysChildren: true,
			compact: true,
			spaces: 2
		});

		var vttHeader = 'WEBVTT\n\n\n';
		var captions = JSON.parse(xml).tt.body.div.p;

		var vttCaptions = captions.reduce(function(acc, value, index) {
			var text = value._text;
			var isArray = Array.isArray(text);
			var attributes = value._attributes;
			var endTime = thisObj.computeEndTime(attributes.begin, attributes.dur);

			var caption =
				thisObj.computeEndTime(attributes.begin, '00:00:0') +
				' --> ' +
				thisObj.computeEndTime(attributes.begin, attributes.dur) +
				'\n' +
				(isArray ? text.join('\n') : text) +
				'\n\n';

			return acc + caption;
		}, vttHeader);

		return vttCaptions;
	};
})(jQuery);
