# LRU Cache based on doubly-linked list.
# Head:Tail::Oldest:Newest

class Entry
    constructor: (@key, @value) ->
        @prev = @next = undefined

class LRUCache
    constructor: (@limit = Infinity) ->
        @mem = {}
        @head = @tail = undefined
        @next = 0

    put: (k, v) ->
        e = new Entry k,v
        @mem[k] = e
        if @tail
            @tail.next = e
            e.prev = @tail
        else
            @head = e
        @tail = e
        @purge() if ++@next > @limit
        @

    # TODO: should add a delete callback support
    purge: ->
        e = @head
        if e
            if @head.next?
                @head = @head.next
                @head.prev = undefined
            else
                @head = undefined
            e.next = e.prev = undefined
            delete @mem[e.key]
            --@next
        e

    # TODO: should add a get failed callback support
    get: (k) ->
        e = @mem[k]
        return undefined unless e?
        return e.value if e is @tail
        if e.next
            if e is @head
                @head = e.next
            e.next.prev = e.prev
        if e.prev
            e.prev.next = e.next
        e.next = undefined
        e.prev = @tail
        @tail.next = e if @tail
        @tail = e
        e.value

    remove: (k) ->
        e = @mem[k]
        return undefined unless e?
        delete @mem[e.key]
        --@next
        if e.next? and e.prev? # middle
            e.prev.next = e.next
            e.next.prev = e.prev
        else if e.next?     # head
            e.next.prev = undefined
            @head = e.next
        else if e.prev?     # tail
            e.prev.next = undefined
            @tail = e.prev
        e.value

    has: (k) -> @mem[k]?

    dump: ->
        s = '[ '
        next = @head
        while next?
            s += next.key + " "
            next = next.next
        s += ']'
        s

    size: -> @next

#exports.LRUCache = LRUCache
