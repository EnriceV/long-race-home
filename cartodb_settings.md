# CartoDB settings

## Layer 1: checkpoints

### SQL

```sql
SELECT * FROM checkpoints
```

### Wizard

select `simple`

### Infowindow

Custom html:

```
<div class="cartodb-popup v2">
  <a href="#close" class="cartodb-popup-close-button close">x</a>
  <div class="cartodb-popup-content-wrapper">
    <div class="cartodb-popup-content">
      <h3>{{name}}: {{description}}</h3>
       <img src="{{image_url}}" height=180 width=180/>
    </div>
  </div>
  <div class="cartodb-popup-tip-container"></div>
</div>
```

### Cartocss

```
    /** simple visualization */

    #checkpoints{
      marker-file: url(http://com.cartodb.users-assets.production.s3.amazonaws.com/pin-maps/dark11.svg);
      marker-fill-opacity: 0.9;
      marker-line-color: #FFF;
      marker-line-width: 1;
      marker-line-opacity: 1;
      marker-placement: point;
      marker-type: ellipse;
      marker-width: 14.5;
      marker-fill: #000000;
      marker-allow-overlap: true;
    }

    #checkpoints::labels {
      text-name: [name];
      text-face-name: 'DejaVu Sans Book';
      text-size: 10;
      text-label-position-tolerance: 0;
      text-fill: #000;
      text-halo-fill: #FFF;
      text-halo-radius: 1;
      text-dy: -14.5;
      text-allow-overlap: true;
      text-placement: point;
      text-placement-type: dummy;
    }
```

### Legend

None

## Layer 2 track lines

### SQL

```
SELECT ST_MakeLine (the_geom_webmercator ORDER BY date_time ASC)
AS the_geom_webmercator, rider_full_name, 'test' as test
FROM tracks
GROUP BY rider_full_name
WHERE date_time>'2015-12-18T19:00:00Z'
```

### Wizard

Type `Category`, Column `rider_full_name`

### Infowindow

None

### Cartocss

```
/** category visualization */

#tracks {
   line-width: 2;
   line-opacity: 0.7;
}

#tracks[rider_full_name="Erik Verbeke"] {
   line-color: #A6CEE3;
}
#tracks[rider_full_name="Gertjan Winten"] {
   line-color: #1F78B4;
}
#tracks[rider_full_name="Hannes Sels"] {
   line-color: #1F78B4;
}
#tracks[rider_full_name="Raf Van Zele"] {
   line-color: #B2DF8A;
}
#tracks[rider_full_name="Stijn Van Hofstraeten"] {
   line-color: #33A02C;
}
#tracks[rider_full_name="Sven Van Looveren"] {
   line-color: #FB9A99;
}
#tracks[rider_full_name="Thomas Van Leemputten"] {
   line-color: #E31A1C;
}
#tracks[rider_full_name="Wim Cheroutre"] {
   line-color: #FDBF6F;
}
#tracks[rider_full_name="Wim Hendrickx"] {
   line-color: #FF7F00;
}
```

### Legend

None

## Layer 3: tracks

### SQL

```
SELECT message_id, to_char(date_time, 'DD-MM HH24:MI:SS') as date_time_str, rider_full_name, the_geom, the_geom_webmercator
FROM tracks
WHERE date_time>'2015-12-18T19:00:00Z'
```

### Wizard

Category, column `rider_name`

### Infowindow

* Hover
* dark
* `rider_full_name` (set title to `Cyclist`)
* `date_time_str` (set title to `date and time`)

### Cartocss

```
   /** category visualization */

#tracks {
   marker-fill-opacity: 0.9;
   marker-line-color: #FFF;
   marker-line-width: 1;
   marker-line-opacity: 1;
   marker-placement: point;
   marker-type: ellipse;
   marker-width: 10;
   marker-allow-overlap: true;
}

#tracks[rider_full_name="Erik Verbeke"] {
   marker-fill: #A6CEE3;
}
#tracks[rider_full_name="Hannes Sels"] {
   marker-fill: #1F78B4;
}
#tracks[rider_full_name="Raf Van Zele"] {
   marker-fill: #B2DF8A;
}
#tracks[rider_full_name="Stijn Van Hofstraeten"] {
   marker-fill: #33A02C;
}
#tracks[rider_full_name="Sven Van Looveren"] {
   marker-fill: #FB9A99;
}
#tracks[rider_full_name="Thomas Van Leemputten"] {
   marker-fill: #E31A1C;
}
#tracks[rider_full_name="Wim Cheroutre"] {
   marker-fill: #FDBF6F;
}
#tracks[rider_full_name="Wim Hendrickx"] {
   marker-fill: #FF7F00;
}
```
### Legend

Template: category


