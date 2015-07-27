# page-replay

Replay page from local cache, honouring load behaviour from multiple domains.

## Usage example

Cache `http://mywebsite.com/page` and serve all resources with a three second delay:

`./replay.js http://mywebsite.com/page --domains mywebsite.com,cdnjs.com,something.static.com --delay 3000`
