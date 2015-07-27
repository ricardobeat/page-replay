# page-replay

Replay page from local cache, honouring load behaviour from multiple domains.

## Usage example

Cache `http://mywebsite.com/page` and serve all resources with a three second delay:

`./replay.js http://mywebsite.com/page --domains mywebsite.com,cdnjs.com,something.static.com --delay 3000`

![Network tab example](https://cloud.githubusercontent.com/assets/97396/8902721/4dbf474c-3453-11e5-93dd-fc45e7a5fcc9.png)

Resources will be save into the `./data` directory, and the page itself as an **.html** in the working dir - you can then edit it for testing if necessary.