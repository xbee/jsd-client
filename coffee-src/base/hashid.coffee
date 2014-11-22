
# Hashids
# http://hashids.org/coffeescript
# (c) 2013 Ivan Akimov

# https://github.com/ivanakimov/hashids.coffee
# hashids may be freely distributed under the MIT license.

# to compile: coffee -cb lib/hashids.coffee

class Hashids

    constructor: (@salt = "", @minHashLength = 0, @alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890") ->

        @version = "1.0.0"

        # internal settings
        @minAlphabetLength = 16
        @sepDiv = 3.5
        @guardDiv = 12

        # error messages
        @errorAlphabetLength = "error: alphabet must contain at least X unique characters"
        @errorAlphabetSpace = "error: alphabet cannot contain spaces"

        # alphabet vars
        @seps = "cfhistuCFHISTU"

        uniqueAlphabet = ""
        for chr in @alphabet
            uniqueAlphabet += chr if uniqueAlphabet.indexOf(chr) is -1

        throw @errorAlphabetLength.replace("X", @minAlphabetLength) if @alphabet.length < @minAlphabetLength
        throw @errorAlphabetSpace if @alphabet.search(" ") isnt -1

        # seps should contain only characters present in alphabet; alphabet should not contains seps

        for chr, i in @seps

            j = @alphabet.indexOf chr
            if j is -1
                @seps = @seps.substr(0, i) + " " + @seps.substr(i + 1)
            else
                @alphabet = @alphabet.substr(0, j) + " " + @alphabet.substr(j + 1)

        @alphabet = @alphabet.replace(RegExp(" ", "g"), "")

        @seps = @seps.replace(RegExp(" ", "g"), "")
        @seps = @consistentShuffle(@seps, @salt)

        if not @seps.length or (@alphabet.length / @seps.length) > @sepDiv

            sepsLength = Math.ceil(@alphabet.length / @sepDiv)

            sepsLength++ if sepsLength is 1

            if sepsLength > @seps.length

                diff = sepsLength - @seps.length
                @seps += @alphabet.substr 0, diff
                @alphabet = @alphabet.substr diff

            else
                @seps = @seps.substr 0, sepsLength

        @alphabet = @consistentShuffle @alphabet, @salt
        guardCount = Math.ceil @alphabet.length / @guardDiv

        if @alphabet.length < 3
            @guards = @seps.substr 0, guardCount
            @seps = @seps.substr guardCount
        else
            @guards = @alphabet.substr 0, guardCount
            @alphabet = @alphabet.substr guardCount

    encode: ->

        ret = ""
        numbers = Array::slice.call arguments

        return ret unless numbers.length

        numbers = numbers[0] if numbers[0] instanceof Array
        for number in numbers
            return ret if typeof number isnt "number" or number % 1 isnt 0 or number < 0

        @_encode numbers

    decode: (hash) ->

        ret = []

        return ret if not hash.length or typeof hash isnt "string"
        @_decode hash, @alphabet

    encodeHex: (str) ->

        return "" unless /^[0-9a-fA-F]+$/.test str
        numbers = str.match /[\w\W]{1,12}/g

        for number, i in numbers
            numbers[i] = parseInt "1" + number, 16

        @encode.apply @, numbers

    decodeHex: (hash) ->

        ret = []
        numbers = @decode hash

        for number, i in numbers
            ret += (numbers[i]).toString(16).substr 1

        ret

    _encode: (numbers) ->

        alphabet = @alphabet
        numbersSize = numbers.length
        numbersHashInt = 0

        for number, i in numbers
            numbersHashInt += (number % (i + 100))

        lottery = ret = alphabet[numbersHashInt % alphabet.length]
        for number, i in numbers

            buffer = lottery + @salt + alphabet
            alphabet = @consistentShuffle alphabet, buffer.substr 0, alphabet.length
            last = @hash number, alphabet

            ret += last

            if i + 1 < numbersSize
                number %= (last.charCodeAt(0) + i)
                sepsIndex = number % @seps.length
                ret += @seps[sepsIndex]

        if ret.length < @minHashLength

            guardIndex = (numbersHashInt + ret[0].charCodeAt(0)) % @guards.length
            guard = @guards[guardIndex]

            ret = guard + ret

            if ret.length < @minHashLength

                guardIndex = (numbersHashInt + ret[2].charCodeAt(0)) % @guards.length
                guard = @guards[guardIndex]

                ret += guard

        halfLength = parseInt alphabet.length / 2
        while ret.length < @minHashLength

            alphabet = @consistentShuffle(alphabet, alphabet)
            ret = alphabet.substr(halfLength) + ret + alphabet.substr(0, halfLength)

            excess = ret.length - @minHashLength
            ret = ret.substr(excess / 2, @minHashLength) if excess > 0

        ret

    _decode: (hash, alphabet) ->

        ret = []
        r = new RegExp "[" + @guards + "]", "g"
        hashBreakdown = hash.replace r, " "
        hashArray = hashBreakdown.split " "

        i = if hashArray.length is 3 or hashArray.length is 2 then 1 else 0
        hashBreakdown = hashArray[i]

        if typeof hashBreakdown[0] isnt "undefined"

            lottery = hashBreakdown[0]
            hashBreakdown = hashBreakdown.substr 1

            r = new RegExp "[" + @seps + "]", "g"
            hashBreakdown = hashBreakdown.replace r, " "
            hashArray = hashBreakdown.split " "

            for subHash in hashArray

                buffer = lottery + @salt + alphabet

                alphabet = @consistentShuffle alphabet, buffer.substr 0, alphabet.length
                ret.push @unhash subHash, alphabet

            ret = [] if @_encode(ret) isnt hash

        ret

    consistentShuffle: (alphabet, salt) ->

        return alphabet	unless salt.length

        i = alphabet.length - 1
        v = 0
        p = 0

        while i > 0

            v %= salt.length
            p += integer = salt[v].charCodeAt(0)
            j = (integer + v + p) % i

            temp = alphabet[j]
            alphabet = alphabet.substr(0, j) + alphabet[i] + alphabet.substr(j + 1)
            alphabet = alphabet.substr(0, i) + temp + alphabet.substr(i + 1)

            i--
            v++

        alphabet

    hash: (input, alphabet) ->

        hash = ""
        alphabetLength = alphabet.length

        while true
            hash = alphabet[input % alphabetLength] + hash
            input = parseInt input / alphabetLength
            break if not input

        hash

    unhash: (input, alphabet) ->

        number = 0

        for chr, i in input
            pos = alphabet.indexOf chr
            number += pos * Math.pow alphabet.length, input.length - i - 1

        number
