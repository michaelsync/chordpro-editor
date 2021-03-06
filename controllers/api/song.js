var chordpro = require('../../lib/chordpro');
var chorddefs = require('../../lib/chorddefs');
var fretboard = require('../../lib/fretboard');
var text2chordpro = require('../../lib/text2chordpro');
var router = require('express').Router();
var Song = require('../../lib/songinmem');


var songs = [];

function getSong(paramId) {

  for (i = 0; i < songs.length; i++) {
    if (songs[i]._id == paramId) {
      return songs[i];
    }
  }

  return null;
}

function parseSong(newText) {
  var song = {
          title: "", _id: "", artist: "",
          lyrics: [],
          chorddefs:[],
          chords: [],
          text: "",
          sections:[]
      };

  if (!text2chordpro.isChordpro(newText)) {
    newText = text2chordpro.fromText(newText);
  }

  song = chordpro.fromString(newText);

  chords = chordpro.distinctChords(song);
  defs = chorddefs.getdefs(chords);
  song = chordpro.addDefs(song, defs, { replace:false });

  for (s = 0; s < song.chorddefs.length; s++) {
    song.chorddefs[s].positions = fretboard.getFingerPositions(song.chorddefs[s]);
  }

  song.text = chordpro.toString(song);

  return song;
}

router.get('/:id',function(req,res,next) {
  var song = getSong(req.params.id);

  if (song == null) {
    Song.findById(req.params.id, function(err, dbSong) {
      if (err) {
          console.error(err);
          return next(err);
      }
      if (dbSong != null && dbSong.text != null) {
        song = parseSong(dbSong.text);
        songs.push(song);
        res.json(song);
      }
    });
  } else {
    res.json(song);
  }
});

router.get('/',function(req,res,next) {
  res.json(songs);
});

router.post('/',function(req,res,next) {
  var song = parseSong(req.body.text);
  song._id = songs.length.toString();
  songs.push(song);
	res.status(201).json(songs[songs.length-1]);
});

router.put('/:id',function(req,res,next) {
  var song = getSong(req.params.id);

  if (song != null) {
    var id = parseInt(song._id);

    if ( req.body.hasOwnProperty('chorddef') ) {
      song = chordpro.addDefs(song, req.body.chorddef, { replace:true });
      song = parseSong(chordpro.toString(song));
    }

    if ( req.body.hasOwnProperty('text') ) {
      song = parseSong(req.body.text);
    }

    song._id = req.params.id;
    songs[id] = song;

  	res.status(200).json(song);
  }
});

router.put('/:id/chords/:chordid',function(req,res,next) {
  var song = getSong(req.params.id);

  if (song != null) {
    var id = parseInt(song._id);
    if (req.params.chordid >= 0 && req.params.chordid < song.chords.length) {
      if ( req.body.hasOwnProperty('name') ) {
        song = chordpro.renameChord(song, song.chords[req.params.chordid].name, req.body.name);
      }
      if ( req.body.hasOwnProperty('col') ) {
        var col = parseInt(req.body.col);
        var to = { name:song.chords[req.params.chordid].name , line:song.chords[req.params.chordid].line , col:col };
        song = chordpro.moveChord(song, song.chords[req.params.chordid], to);
      }
      song._id = req.params.id;
      songs[id] = song;
    }

  	res.status(200).json(song);
  }
});

router.get('/:id/sections/:sectionid',function(req,res,next) {
  var song = getSong(req.params.id);
  var section = { title:"" , chords:[] , lyrics:[] , _id:''};

  if (song != null) {
    section = chordpro.getSection(song, req.params.sectionid);
    section._id = req.params.id;
  }

  res.json(section);
});

router.put('/:id/sections/:sectionid',function(req,res,next) {
  var song = getSong(req.params.id);

  if (song != null) {
    var id = parseInt(song._id);
    if (req.params.sectionid >= 0 && req.params.sectionid < song.sections.length) {
      if ( req.body.hasOwnProperty('section') ) {
        song = chordpro.copyChords(song, req.body.section, req.params.sectionid);
      }
      song._id = req.params.id;
      songs[id] = song;
    }

  	res.status(200).json(song);
  }
});

module.exports = router
