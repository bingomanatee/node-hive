# hive-world

hive-world is a creation and storage engine for planet data. You can layer any number of data on a single planet; by default these layers are provided:  

## Worlds

A world has the following basic properties. Note that measurement units are strings;
typically 'miles', 'yards', 'feet', 'inches', 'km', 'm', 'cm'

* **Name**: (string)
* **Radius**: (uint) the size of the planet in Size Units. 
* **Size Units**: (string) units of the ground measurement system. default: meters.
* **Height Units** : (string) the unit for height measurements.  default: meters
* **Sea level**: how high above zero is the sea level in height units. (default, 10,000 meters)

The degree system in hive-world is lat (-90..90), lon(-180..180);

## Maps

A map is a collection of data on a given region, at a given resolution. Note that a world can have more than one map
covering a given set of coordinates, so you can "zoom in" on regions of interest, etc. Its up to you to rationalize
zoomed maps with larger maps. 

Each map has the following parameters:

* **Name** (string) - must be unique within the context of a world
* **Coverage**: an array of: {top, left, bottom, right: all float [-180...180]. 
  Most maps will have a single coverage set, but you can "jigsaw" multiple areas of the map if you wan tto 
* **layers**: an array of Layer data. 

### Map Layers

Each map has one or more layers of data. A layer is a collection of map data expressed in the coordinate system of the map.
A layer will have the following parameters: 

* **Name**: String - must be unique within the context of a map
* **bytes**: uint the number of bytes per coordinate
* **data**: A buffer of byte data
* **data_document**: a reference to a gridFS store of data, for large layers

### Base Layers

Most maps will have the following layers: 

* **height** - an unsigned integer of height above radius. *
* **biome** - an unsigned byte (0-255) describing what kind of vegetation etc. exist on a specific point. 
* **water** - an unsigned byte describing the water deposits on the map. 
  Its up to you to interpret this - i.e., is it water above height, absolute height of water, or whether rivers are here or in bioms

You can have as many layers as you want with whatever depths you want. 

----------------------
(* note - assuming perfectly spherical planetoids, because life is short. )
