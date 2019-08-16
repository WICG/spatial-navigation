module.exports = {
    "env": {
        "webextensions": true,
        "commonjs": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": 0,
        "no-undef": 0,
        "space-before-blocks": ["error", { "functions": "always", "keywords": "always", "classes": "always" }],
        "space-infix-ops": "error",
        "no-control-regex": 0,
        "no-debugger": 1,
        "no-empty": 0,
        "no-negated-in-lhs": 2,
        "no-regex-spaces": 0,
        "block-scoped-var": 1,
        "no-caller": 2,
        "no-div-regex": 1,
        "no-eval": 1,
        "no-extra-bind": 1,
        "no-implied-eval": 1,
        "no-labels": 2,
        "no-native-reassign": 2,
        "no-new-func": 2,
        "no-new-wrappers": 2,
        "no-new": 1,
        "no-octal-escape": 1,
        "no-redeclare": [2, {builtinGlobals: true}],
        "no-return-assign": [2, "except-parens"],
        "no-self-compare": 2,
        "no-sequences": 2,
        "no-throw-literal": 2,
        "no-unused-expressions": [1, {allowShortCircuit: true, allowTernary: true}],
        "no-useless-call": 2,
        "no-useless-return": 1,
        "no-with": 2,
        "no-catch-shadow": 2,
        "no-label-var": 2,
        "no-shadow-restricted-names": 2,
        "no-shadow": [2, {builtinGlobals: true, hoist: "all", allow: ["context"]}],
        "no-use-before-define": [2, {functions: false}],
        "linebreak-style": 1,
        "new-cap": [2, {newIsCap: true, capIsNew: false}],
        "no-array-constructor": 2,
        "no-lonely-if": 1,
        "no-new-object": 1,
        "no-unneeded-ternary": 1,
        "spaced-comment": [1, "always", {markers: ["*"]}],
        "require-yield": 0,
        "no-var": 1,
        "prefer-const": 1
    },
    "parserOptions": {
        "sourceType": "module"
    }
};