# hive-world

hive-world is a creation and storage engine for planet data. You can layer any number of data on a single planet; by default these layers are provided:  

## Worlds

A world has the following basic properties:

* **Name**: (string)
* **Radius**: (uint) the size of the planet in Size Units. 
* **Size Units**: (string) the ground measurement system, typically 'miles', 'yards', 'feet', 'inches', 'km', 'm', 'cm'
* **Height Units** : (string) the unit system for height data. (as above),

The degree system in hive-world is lat (-90..90), lon(-180..180);

## Maps

A map is a collection of data on a given region, at a given resolution. 

Each map has the following parameters:

* **Name**
* **Coverage**: an array of: {top, left, bottom, right: all float [-180...180]. 
  Most maps will have a single coverage set, but you can "jigsaw" multiple areas of the map if you wan tto 
* **layers**: an array of Layer data. 

### Map Layers

A layer is a collection of map data. Most maps will have the following layers: 

### Base Layers

* **height** - a signed integer of (units) above or below sea level. 
* **biome** - an unsigned byte (0-255) describing what kind of vegetation etc. exist on a specific point. 

These points of information are stored in a grid (width) x (height); how that equates to the planet's coordinate system is up to you. 

#### Other Layers 

You can have any number of layers with arbitrary bit depths; they have a (bytes) parameter indicating how many bytes are stored at each coordinate area

##### Packed Layers 

Packed layers have arbitrary bit chunks of data. Its up to you to decide how to pack and encrypt those layers. 
