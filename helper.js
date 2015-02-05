const
    data   = require('./data.json')
  , config = require('./config.js')
  , twilio = require('twilio')
  , client = twilio(config.twilio.accountSid, config.twilio.authToken);

/* Text the client back the parsed data */
exports.sendSMSToClient = function(request, parsedData) {
  client.messages.create({
    to: request.query.From,
    from: request.query.To,
    body: parsedData
  }, function(error, message) {
    if (error) {
      console.log(error.message);
    }
  });

};


/* Determines if the request is from Twilio */
exports.fromTwilio = function(request) {
  var sig  = request.headers['x-twilio-signature']
    , url  = config.twilio.messagingUrl + request.url.search
    , body = request.payload || {};
  return twilio.validateRequest(config.twilio.authToken, sig, url, body);
};


/* Fetches most recent recommended movies */
exports.getRecommendedMovies = function(callback) {

  moviesURL = 'http://www.rottentomatoes.com/';

  request(moviesURL, function(error, response, body) {

    if(!error && response.statusCode === 200) {
      var $      = cheerio.load(body)
        , movies = [];

      $('tr td.middle_col', '#homepage-top-box-office').each(function(movie) {
        var movieTitle = $(this).text();
        if(movieTitle.length > 0) {
          // Get just the movie title
          movies.push(movieTitle.replace(/(\r\n|\n|\r)/gm,"").trim());
        };
      });

    };
    callback(movies);
  });
};


/* Returns the parsed request body and data for the determined phrase */
exports.parseRequestBody = function(request, callback) {
    /* Clean and parse the request body */
    var twilioBody  = request.query.Body.trim().split(' ');
    twilioBody      = twilioBody.map(function(element) {
      return element.toLowerCase().trim();
    });
    var keyword     = twilioBody[0];

    /* Retrieve the requested data based on the parsed body. */
    switch (keyword) {
      case 'learn':
        /* Get the requested term, which is after keyword and before last word */
        var content    = twilioBody.slice(1, twilioBody.length - 1).join(' ')
          , method     = twilioBody[twilioBody.length - 1]
          , resultData = data[keyword][content][method].join('\n');
        break;

      case 'how':
        var askedData  = twilioBody.slice(1, twilioBody.length)
          , resultData = data[keyword][askedData];
        break;

      case 'random':
        var lowerBound = twilioBody[1]
          , upperBound = twilioBody[2];
          //resultData = lowerBound <-- random --> upperBound
        break;
      case 'recommend':
        // 'recommend a movie'
        if(twilioBody.indexOf('movie') > -1) {
          getRecommendedMovies(movies) {
            resultData = movies.join('\n');
          };
        }
      case 'coinflip':
        //resultData = Heads <-- random --> Tails
        break;

      case 'help':
        // give tutorial of possible commands
        break;

      default:
        resultData = "There was a problem :( text help for instructions on using FetchrBot.";
        break;
    }
    callback(null, resultData);
};
