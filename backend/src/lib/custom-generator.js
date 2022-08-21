var expressions = require('angular-expressions');
var translate = require('../translate');


// Apply all customs functions
function apply(data) {

}
exports.apply = apply;

// *** Custom modifications of audit data for usage in word template


// *** Custome Angular expressions filters ***

var filters = {};

// Creates a text block or simple location bookmark:
// - Text block: {@name | bookmarkCreate: identifier | p}
// - Location: {@identifier | bookmarkCreate | p}
// Bookmark identifiers need to begin with a letter and contain only letters,
// numbers, and underscore characters. Spaces and dashes are automatically
// replaced by underscores.
expressions.filters.bookmarkCreate = function(input, refid = null) {
    let rand_id = Math.floor(Math.random() * 1000000 + 1000);
    let parsed_id = (refid ? refid : input).replace(/[- ]/g, '_');

    // Accept both text and OO-XML as input.
    if (input.indexOf('<w:r') !== 0) {
        input = '<w:r><w:t>' + input + '</w:t></w:r>';
    }

    return '<w:bookmarkStart w:id="' + rand_id + '" '
        + 'w:name="' + parsed_id + '"/>'
        + input
        + '<w:bookmarkEnd w:id="' + rand_id + '"/>';
}

// Creates a hyperlink to a text block or location bookmark:
// {@input | bookmarkLink: identifier | p}
expressions.filters.bookmarkLink = function(input, identifier) {
    return '<w:hyperlink w:anchor="' + identifier + '">'
        + '<w:r><w:rPr><w:rStyle w:val="Lienhypertexte"/></w:rPr>'
        + '<w:t>' + input + '</w:t>'
        + '</w:r></w:hyperlink>';
}

// Creates a clickable dynamic field referencing a text block bookmark:
// {@identifier | bookmarkRef | p}
expressions.filters.bookmarkRef = function(input) {
    return '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">'
        + ' REF ' + input.replaceAll('-', '_') + ' \\h </w:instrText></w:r>'
        + '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>'
        + input + '</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
}

// Capitalizes input first letter: {input | capfirst}
expressions.filters.capfirst = function(input) {
    if (!input || input == "undefined") return input;
    return input.replace(/^\w/, (c) => c.toUpperCase());
}

// Default value: returns input if it is truthy, otherwise its parameter.
// Example producing a comma-separated list of affected systems, falling-back on the whole audit scope: {affected | lines | d: (scope | select: 'name') | join: ', '}
expressions.filters.d = function(input, s) {
    return (input && input != "undefined") ? input : s;
}

// Display "From ... to ..." dates nicely, removing redundant information when the start and end date occur during the same month or year: {date_start | fromTo: date_end:'fr' | capfirst}
// To internationalize or customize the resulting string, associate the desired output to the strings "from {0} to {1}" and "on {0}" in your Pwndoc translate file.
expressions.filters.fromTo = function(start, end, locale) {
    const start_date = new Date(start);
    const end_date = new Date(end);
    let options = {}, start_str = '', end_str = '';
    let str = "from {0} to {1}";

    if (start_date == "Invalid Date" || end_date == "Invalid Date") return start;

    options = {day: '2-digit', month: '2-digit', year: 'numeric'};
    end_str = end_date.toLocaleDateString(locale, options);

    if (start_date.getYear() != end_date.getYear()) {
        options = {day: '2-digit', month: '2-digit', year: 'numeric'};
        start_str = start_date.toLocaleDateString(locale, options);
    }
    else if (start_date.getMonth() != end_date.getMonth()) {
        options = {day: '2-digit', month: '2-digit'};
        start_str = start_date.toLocaleDateString(locale, options);
    }
    else if (start_date.getDay() != end_date.getDay()) {
        options = {day: '2-digit'};
        start_str = start_date.toLocaleDateString(locale, options);
    }
    else {
        start_str = end_str;
        str = "on {0}";
    }

    return translate.translate(str).format(start_str, end_str);
}

// Group input elements by an attribute: {#findings | groupBy: 'severity'}{title}{/findings | groupBy: 'severity'}
// Source: https://stackoverflow.com/a/34890276
expressions.filters.groupBy = function(input, key) {
    return input.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

// Returns the initials from an input string (typically a firstname): {creator.firstname | initials}
expressions.filters.initials = function(input) {
    if (!input || input == "undefined") return input;
    return input.replace(/(\w)\w+/gi,"$1.");
}

// Returns a string which is a concatenation of input elements using an optional separator string: {scope | join: ', '}
// Can also be used to build raw OOXML strings.
expressions.filters.join = function(input, sep = '') {
    if (!input || input == "undefined") return input;
    return input.join(sep);
}

// Returns the length (ie. number of items for an array) of input: {input | length}
// Can be used as a conditional to check the emptiness of a list: {#input | length}Not empty{/input | length}
expressions.filters.length = function(input) {
    return input.length;
}

// Takes a multilines input strings (either raw or simple HTML paragraphs) and returns each line as an ordered list: {input | lines}
expressions.filters.lines = function(input) {
    if (!input || input == "undefined") return input;
    if (input.indexOf('<p>') == 0) {
        return input.substring(3,input.length - 4).split('</p><p>');
    }
    else {
        return input.split("\n");
    }
}

// Loop over the input object, providing acccess to its keys and values: {#findings | loopObject}{key}{value.name}{/findings | loopObject}
// Source: https://stackoverflow.com/a/60887987
expressions.filters.loopObject = function(input) {
    return Object.keys(input).map(function(key) {
        return { key , value : input[key]};
    });
}

// Lowercases input: {input | lower}
expressions.filters.lower = function(input) {
    if (!input || input == "undefined") return input;
        return input.toLowerCase();
}

// Creates a clickable "mailto:" link, assumes that input is an email address if
// no other address has been provided as parameter:
// {@lastname | mailto: email | p}
expressions.filters.mailto = function(input, address = null) {
    return expressions.filters.linkTo(input, 'mailto:' + (address ? address : input));
}

// Creates a hyperlink: {@input | linkTo: 'https://example.com' | p}
expressions.filters.linkTo = function(input, url) {
    return '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        + '<w:r><w:instrText xml:space="preserve"> HYPERLINK "' + url + '" </w:instrText></w:r>'
        + '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        + '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'
        + '<w:t>' + input + '</w:t>'
        + '</w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
}

// Applies a filter on a sequence of objects: {scope | select: 'name' | map: lower | join: ', '}
expressions.filters.map = function(input, filter) {
    let args = Array.prototype.slice.call(arguments, 2);
    return input.map(x => expressions.filters[filter](x, ...args));
}

// Embeds input within OOXML paragraph tags, applying an optional style name to it: {@input | p: 'Some style'}
expressions.filters.p = function(input, style = null) {
    let result = '<w:p>';

    if (style !== null ) {
        let style_parsed = style.replaceAll(' ', '');
        result += '<w:pPr><w:pStyle w:val="' + style_parsed + '"/></w:pPr>';
    }
    result += input + '</w:p>';

    return result;
}

// Reverses the input array: {input | reverse}
expressions.filters.reverse = function(input) {
    return input.reverse();
}

// Looks up an attribute from a sequence of objects, doted notation is supported: {findings | select: 'cvss.environmentalSeverity'}
expressions.filters.select = function(input, attr) {
    return input.map(function(item) { return _getPropertyValue(item, attr) });
}

// Sorts the input array according an optional given attribute, dotted notation is supported: {#findings | sort 'cvss.environmentalSeverity'}{name}{/findings | sort 'cvss.environmentalSeverity'}
expressions.filters.sort = function(input, key = null) {
    if (key === null) {
        return input.sort();
    }
    else {
        return input.sort(function(a, b) {
            return _getPropertyValue(a, key) < _getPropertyValue(b, key);
        });
    }
}

// Takes a string as input and split it into an ordered list using a separator: {input | split: ', '}
expressions.filters.split = function(input, sep) {
    if (!input || input == "undefined") return input;
    return input.split(sep);
}

// Capitalizes input first letter of each word, can be associated to 'lower' to normalize case: {creator.lastname | lower | title}
expressions.filters.title= function(input) {
    if (!input || input == "undefined") return input;
    return input.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
}

// Returns the JSON representation of the input value, useful to dump variables content while debugging a template: {input | toJSON}
expressions.filters.toJSON = function(input) {
    return JSON.stringify(input);
}

// Upercases input: {input | upper}
expressions.filters.upper = function(input) {
    if (!input || input == "undefined") return input;
    return input.toUpperCase();
}

// Filters input elements matching a free-form Angular statements: {#findings | where: 'cvss.severity == "Critical"'}{title}{/findings | where: 'cvss.severity == "Critical"'}
// Source: https://docxtemplater.com/docs/angular-parse/#data-filtering
expressions.filters.where = function(input, query) {
    return input.filter(function (item) {
        return expressions.compile(query)(item);
    });
};

// Filter helper: handles the use of dotted notation as property names.
// Source: https://stackoverflow.com/a/37510735
function _getPropertyValue(obj, dataToRetrieve) {
  return dataToRetrieve
    .split('.')
    .reduce(function(o, k) {
      return o && o[k];
    }, obj);
}

// Filter helper: handles the use of preformated easilly translatable strings.
// Source: https://www.tutorialstonight.com/javascript-string-format.php
String.prototype.format = function () {
    let args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
};



// Renders remediation complexity field value: {remediationComplexity | renderComplexity}
expressions.filters.renderComplexity = function(input) {
        return '✱'.repeat(input);
}

// Renders remediation priority field value: {priority | renderPriority}
expressions.filters.renderPriority = function(input) {
        return ["P3 – Long terme", "P2 – Moyen terme", "P1 – Court terme", "P0 – Immédiat"][input - 1];
}

function _renderFinding(prefix, seq, message) {
        return '<w:r><w:rPr><w:b/></w:rPr><w:t>' + prefix + '</w:t></w:r>'
                + '<w:fldSimple w:instr=" SEQ ' + seq + ' \\* MERGEFORMAT "><w:r><w:rPr><w:b/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>'
                + '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve"> : </w:t></w:r>'
                + '<w:r><w:t>' + message + '</w:t></w:r>';
}

// Renders a vulnerability: {@ libellevulnerabilite | renderVuln}
expressions.filters.renderVuln = function(input) {
        return _renderFinding('V', 'VULN', input);
}

expressions.filters.loopReco = function(input) {
        let result = [];
        let findings = expressions.filters.where(input, 'statut != "Point remarquable"');
        findings = expressions.filters.groupBy(findings, 'priority');
        findings = expressions.filters.loopObject(findings);
        findings = expressions.filters.sort(findings, 'key');
        findings = expressions.filters.reverse(findings);

        let rank = function(value) {
                return ['None', 'Low', 'Medium', 'High', 'Critical'].indexOf(value.cvss.environmentalSeverity) + 1;
        };

        findings = findings.map(function(priority) {
                return {
                        'key': priority.key,
                        'value': result[priority.key] = priority.value.sort(function(a, b) {
                                return rank(b) - rank(a);
                        })
                };
        });

        return findings;
}


// Renders a recommandation: {@ libellerecommandation | renderReco}
expressions.filters.renderReco = function(input) {
        return _renderFinding('R', 'RECO', input);
}

// Render a positive finding: {@ libellepointremarquable | renderPointNotable}
expressions.filters.renderPointNotable = function(input) {
        return _renderFinding('P', 'POINTNOTABLE', input);
}

// Render a human readable value associated to a metric: {cvss | CVSS: 'AV'}
expressions.filters.CVSS = function(cvss, metric) {
        const regex = new RegExp(`\\/${metric}:[^\\/]+`);
        const extract = cvss.vectorString.match(regex);
        return translate.translate(extract ? extract[0].slice(1) : "Not Defined");
}

// Highlight text within '<...>' in the knowledge base, feature inherited from GTT.
expressions.filters.highlight = function(input) {
        return input.replace(/&lt;.+?&gt;/g, function(s) {
                return '</w:t></w:r><w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr><w:t>'
                        + s.replace(/<[^>]*?>/g, '')
                        + '</w:t></w:r><w:r><w:t>';
        });
}

// Convert input CVSS criteria into French: {input | criteriaFR}
expressions.filters.criteriaFR = function(input) {
    var pre = '<w:p><w:r><w:t>';
    var post = '</w:t></w:r></w:p>';
    var result = "Non défini"

    if (input === "Network") result = "Réseau"
    else if (input === "Adjacent Network") result = "Réseau Local"
    else if (input === "Local") result = "Local"
    else if (input === "Physical") result = "Physique"
    else if (input === "None") result = "Aucun"
    else if (input === "Low") result = "Faible"
    else if (input === "High") result = "Haute"
    else if (input === "Required") result = "Requis"
    else if (input === "Unchanged") result = "Inchangé"
    else if (input === "Changed") result = "Changé"

    // return pre + result + post;
    return result;
}

// Convert input date with parameter s (full,short): {input | convertDate: 's'}
expressions.filters.convertDateFR = function(input, s) {
    var date = new Date(input);
    if (date !== "Invalid Date") {
        var monthsFull = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        var monthsShort = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        var days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        var day = date.getUTCDate();
        var month = date.getUTCMonth();
        var year = date.getUTCFullYear();
        if (s === "full") {
            return days[date.getUTCDay()] + " " + (day<10 ? '0'+day: day) + " " + monthsFull[month] + " " + year;
        }
        if (s === "short") {
            return (day<10 ? '0'+day: day) + "/" + monthsShort[month] + "/" + year;
        }
    }
}

exports.expressions = expressions

