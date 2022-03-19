const vscode = require('vscode'); // eslint-disable-line import/no-unresolved
const axios = require('axios');
const { hostname } = require('os');


class Testaustime {
    /**
    * @param {vscode.ExtensionContext} context
    */
    constructor(context) {
        this.context = context;
        this.config = context.globalState;
        this.apikey = "";
        this.endpoint = "";
        this.interval = 0;
    }

    /**
     * 
     * @returns {object}
     */
    data() {
        return {
            project_name: vscode.workspace.name,
            language: vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.languageId : '',
            editor_name: "vscode",
            hostname: hostname(),
        }
    }

    heartbeat() {
        axios.post(`${this.endpoint}/activity/update`,
            this.data(),
            {
                headers: {
                    Authorization: `Bearer ${this.apikey}`,
                },
            });
    }

    flush() {
        axios.post(`${this.endpoint}/activity/flush`, "", {
            headers: {
                "Authorization": `Bearer ${this.apikey}`
            }
        });
    }

    /**
     * @returns {boolean}
     */
    async validateApikey() {
        const result = await axios.get(`${this.endpoint}/users/@me`, {
            headers: {
                "Authorization": `Bearer ${this.apikey}`
            }
        });

        return result.status === 200 ? true : false;
    }

    async commands() {
        const test = vscode.commands.registerCommand('testaustime.test', () => {
            vscode.window.showInformationMessage(JSON.stringify(this.data()));
        });

        const setapikey = vscode.commands.registerCommand('testaustime.setapikey', async () => {
            const result = await vscode.window.showInputBox({
                placeHolder: 'Your API-key',
            });

            if (!result) return;

            vscode.window.showInformationMessage('Testing API-key...');

            const isValid = await this.validateApikey();

            if (!isValid) {
                vscode.window.showInformationMessage('API key invalid');
                return;
            }

            this.config.update('apikey', result);
            this.apikey = result;

            vscode.window.showInformationMessage('API key set!');
        });

        const setcustomapi = vscode.commands.registerCommand('testaustime.setendpoint', async () => {
            const result = await vscode.window.showInputBox({
                placeHolder: this.endpoint,
                validateInput: (text) => (text.endsWith('/') ? 'Don\'t include the last slash' : null),
            });

            if (!result || result.endsWith('/')) return;

            this.config.update('endpoint', result);
            this.endpoint = result;

            vscode.window.showInformationMessage('Endpoint key set!');
        });

        this.context.subscriptions.push(test);
        this.context.subscriptions.push(setapikey);
        this.context.subscriptions.push(setcustomapi);
    }

    activate() {
        this.apikey = this.config.get("apikey");
        this.endpoint = this.config.get("endpoint", "https://time.lajp.fi");
        this.commands();

        if (!this.validateApikey()) {
            vscode.window.showErrorMessage('API key invalid!');
        }

        this.interval = setInterval(() => {
            if (!vscode.window.state.focused && this.apikey) {
                this.flush();
                return;
            }

            this.heartbeat();
        }, 20000);
    }

    deactivate() {
        clearInterval(this.interval);
        this.flush();
    }
}


let testaustime;
function activate(context) {
    testaustime = new Testaustime(context);
    testaustime.activate();
}
function deactivate() {
    testaustime.deactivate();
}

module.exports = {
    activate,
    deactivate,
};
