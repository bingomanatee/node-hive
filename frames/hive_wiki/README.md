# Hive Wiki

The hive wiki is an article engine using markdown; while it is designed to use wiki style links,
it is suitable for a general purpose blog.

Articles have three schemes of organization: topics, names and tags.

An articles name is an underscored word that can be used in a link to find the article. For instance,
an article "Finding the right Mate for your Dog" can be name-keyed finding_mate_dog or some such.

Articles are grouped under topics; a topic is also an underscored word, and there is a "topic article"
in each topic space, whose "is_topic" flag is set to true, that serves as the "home page" for all
articles in the topic.

Within each topic group, article names are unique; put another way, every combination of topic and name
is unique, and in fact, forms the _id property of the article. So, you can have a topic collection "toys"
within which are "star_trek", "dukes_of_hazard", "a_team" and a collection "70s_tv" which has "cars",
"star_trek", "a_team" and its legal.

Additionally, articles have tags. Tags are arbitrary strings that reflect an article's theme(s). Unlike topics,
for which there is an actual article connected to the topic phrase, there are no articles for tags. An article can
have as many tags as you want.

On the topic home page, articles are listed under the tag(s) they belong to.