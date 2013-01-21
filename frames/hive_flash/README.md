# hive_flash

Hive-flash emulates the flash behavior that was once default in `express.js` - the ability to push messages onto
an HTML alert region from the action. These messages are stored in the session under the flash property
and are expressed and erased when the view method $flash_messages() is called. That method returns an html
formatted message block; use as follows:

<%- $flash_messages() %>

See test cases for sample usages. 