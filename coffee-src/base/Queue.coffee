#
#
#Queue.js
#
#A function to represent a queue
#
#Created by Stephen Morley - http://code.stephenmorley.org/ - and released under
#the terms of the CC0 1.0 Universal legal code:
#
#http://creativecommons.org/publicdomain/zero/1.0/legalcode
#
#
class Queue
    constructor: ->
        @queue = []
        @index = 0
    getLength: ->
        @queue.length - @index

    isEmpty: ->
        @queue.length is 0

    enqueue: (data) ->
        @queue.push data
        return

    dequeue: ->
        return `undefined` if @queue.length is 0
        top = @queue[@index]
        if ++@index * 2 >= @queue.length
            @queue = @queue.slice(@index)
            @index = 0
        top

    peek: ->
        (if @queue.length > 0 then @queue[@index] else `undefined`)


