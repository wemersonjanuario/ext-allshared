{
    "packagename": "{packagename}",
    "buildfolder": "build",
    "manifestfolder": "manifest",

    "name": "bundler",
    "framework": "ext",
    "toolkit": "modern",
    "theme": "theme-material",
    "requires": [
        "renderercell",
        "font-ext",
        "ux",
        "d3",
        "pivot-d3",
        "font-awesome",
        "exporter",
        "pivot",
        "calendar",
        "charts",
        "treegrid",
        "froala-editor"
    ],
    "output": {
        "base": "./build/$\u007Bapp.packagename}",
        "resources": {
            "path": "./"
        }
    },
    "css": [
        {
            "path": "$\u007Bbuild.out.css.path}",
            "bundle": true,
            "exclude": ["fashion"]
        }
    ],
    "production": {
        "output": {
            "appCache": {
                "enable": true,
                "path": "cache.appcache"
            }
        },
        "loader": {
            "cache": "$\u007Bbuild.timestamp}"
        },
        "cache": {
            "enable": true
        }
    }
}
