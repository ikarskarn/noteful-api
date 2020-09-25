const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNotes = note => ({
    id: note.id,
    note_name: xss(note.note_name),
    date_modified: note.date_modified,
    folder_id: note.folder_id,
    content: xss(note.content),
})

notesRouter
.route('/')
.get((req, res, next) => {
    const knexInstance = req.app.get('db')
    NotesService.getAllNotes(knexInstance)
    .then(notes => {
        res.json(notes.map(serializeNotes))
    })
    .catch(next)
})
.post(jsonParser, (req, res, next) => {
    const { note_name, folder_id, content } = req.body
    const newNote = { note_name, folder_id, content }
    
    for (const [key, value] of Object.entries(newNote)) {
        if (value == null) {
            return res.status(400).json({
                error: { message: `Missing '${key}' in request body` }
            })
        }
    }

    //newNote.note_name = note_name;
    //newNote.folder_id = folder_id;
    //newNote.content = content;

    NotesService.insertNote(
        req.app.get('db'),
        newNote
    )
    .then(note => {
        res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${note.id}`))
        .json(serializeNotes(note))
    })
    .catch(next)
})

notesRouter
.route('/:note_id')
.all((req, res, next) => {
    NotesService.getById(
        req.app.get('db'),
        req.params.note_id
    )
    .then(note => {
        if (!note) {
            return res.status(404).json({
                error: { message: `Note doesn't exist` }
            })
        }
        res.note = note
        next()
    })
    .catch(next)
})
.get((req, res, next) => {
    res.json({
        id: res.note.id,
        noteName: xss(res.note.note_name),
        date_modified: res.note.date_modified,
        folder_id: res.note.folder_id,
        content: xss(res.note.content),
    })
})
.delete((req, res, next) => {
    NotesService.deleteNote(
        req.app.get('db'),
        req.params.note_id
    )
    .then(numRowsAffected => {
        res.status(204).end()
    })
    .catch(next)
})
.patch(jsonParser, (req, res, next) => {
    const { note_name, folder_id, content } = req.body
    const noteToUpdate = { note_name, folder_id, content }

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
        return res.status(400).json({
            error: {
                message: `Request body must contain either 'note_name', 'folder_id', or 'content'`
            }
        })
    }
    NotesService.updateNote(
        req.app.get('db'),
        req.params.note_id,
        noteToUpdate
    )
    .then(numRowsAffected => {
        res.status(204).end()
    })
    .catch(next)
})

module.exports = notesRouter