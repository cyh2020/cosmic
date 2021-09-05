import MagicString from 'magic-string';
import { pluginsOptions } from './rollup-plugin-svelte';
import smelte from './rollup-plugin-smelte';
const fs=require('fs');
export const smelteTmpFileName = 'smelteTMP.js';
export const smelteRegex = new RegExp(/smelte(\/[a-zA-Z.]+)*/);
const production = !process.env.ROLLUP_WATCH;

function normalize() {
  const list = [];
  ['smelte'].forEach((moduleId) => {
    list.push({
      moduleId: moduleId,
      src: smelteTmpFileName,
      path: 'core/external',
      main: `/${moduleId}.js`,
    });
  });
  return list;
}

export function svelteExtractPlugin() {
  const importedSet = new Set();
  return {
    name: 'svelteExtractPlugin', // this name will show up in warnings and errors
    async buildStart(){
      fs.writeFile(smelteTmpFileName,'//this is generated file\n',(e) => {e && console.log(e);});
    },
    async transform(code, id){
      if (smelteRegex.test(code)){
        const esTree = this.parse(code);
        const imports = esTree.body.filter(b => b.type === 'ImportDeclaration');
        const smelteImports = imports.filter(
          i => i.source && smelteRegex.test(i.source.value) && !i.source.value.includes('css'));
        if (smelteImports.length === 0) return null;

        // write to file
        let content = '';
        smelteImports.forEach(id => {
          const {specifiers, source : { value: path }} = id;
          specifiers.forEach(s => {
            const { imported , local: {name: lcName}} = s;
            const imName = imported ? imported.name : undefined;
            // if use import { A as B } from *, we have imName and lcName, otherWise, we has lcName
            const name = imName || lcName;
            if (!importedSet.has(name)) {
              importedSet.add(name);
              if(s.type === 'ImportDefaultSpecifier') {
                content += `import ${name} from '${path}';\n`;
              } else if(s.type === 'ImportSpecifier') {
                content += `import {${name}} from '${path}';\n`;
              }
            }
          });
        });
        fs.appendFile(smelteTmpFileName, content,e => {e && console.log(e);});

        const transformImport = (mc, imports) => {
          imports.forEach(id => {
            const {specifiers, start, end} = id;
            let ret = 'import {';
            specifiers.forEach(s => {
              const {imported, local: { name: lName }} = s;
              const name = imported ? imported.name : undefined;
              if (s.type === 'ImportDefaultSpecifier') {
                ret += lName + ',';
              } else if (s.type === 'ImportSpecifier') {
                if (name && name !== lName) {
                  ret += `${ name } as ${lName}` + ',';
                } else {
                  ret += lName + ',';
                }
              }
            });
            ret = ret.slice(0, ret.length - 1);
            ret += '} from \'smelte\';';
            mc.overwrite(start, end, ret);
          });
          return mc.toString();
        };

        // transform original code
        const magicContent = new MagicString(code);
        const transformedCode = transformImport(magicContent, smelteImports);
        return {
          code: transformedCode,
          map: null,
        };
      }
      return null;
    },
    buildEnd() {
      let content = 'export {';
      Array.from(importedSet).sort().forEach(i => {
        content += `${i},`;
      });
      content = content.slice(0, content.length - 1);
      content += '};';
      fs.appendFile(smelteTmpFileName, content,e => { e && console.log(e);});
    },
  };
}

export function rmSmelteTmpPlugin() {
  return {
    buildEnd() {
      if (fs.existsSync(smelteTmpFileName)) {
        //file exists
        fs.unlink(smelteTmpFileName, e => { e && console.log(e);});
      }
    },
  };
}
function options(config) {
  const path = 'core/external';
  return {
    input: config.src,
    output: {
      sourcemap: !production,
      format: 'es',
      file: `dist/${config.path}${config.main || ''}`,
    },
    plugins: [
      ...pluginsOptions(path, true),
      production && rmSmelteTmpPlugin(),
    ],
  };
}

// for rollup config, compile after generate
export function configs() {
  return production ?  normalize().map((config) => options(config)) : [];
}

// for import
export function importMap() {
  const imports = {};
  normalize().forEach((c) => {
    if (c) imports[c.moduleId] = '/' + c.path + (c.main || '');
  });
  return {
    imports,
  };
}
