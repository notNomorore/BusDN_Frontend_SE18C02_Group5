import fs from 'node:fs';
import path from 'node:path';

const targetFile = path.resolve(process.cwd(), 'node_modules', 'esbuild', 'lib', 'main.js');
const wasmFile = path.resolve(process.cwd(), 'node_modules', 'esbuild-wasm', 'esbuild.wasm');

const shim = `'use strict';
const fs = require('node:fs');

const createBrowserCompatibleFs = (nodeFs) => {
  const decoder = new TextDecoder('utf-8');
  let outputBuf = '';
  const BACKSLASH = String.fromCharCode(92);

  const toNativePath = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const browserPath = value.startsWith('/') && /^[A-Za-z]:\//.test(value.slice(1))
      ? value.slice(1)
      : value;

    return browserPath.split(BACKSLASH).join('/');
  };

  const enosys = () => {
    const err = new Error('not implemented');
    err.code = 'ENOSYS';
    return err;
  };

  const writeConsole = (buf) => {
    outputBuf += decoder.decode(buf);
    const nl = outputBuf.lastIndexOf('\\n');
    if (nl !== -1) {
      console.log(outputBuf.substring(0, nl));
      outputBuf = outputBuf.substring(nl + 1);
    }
    return buf.length;
  };

  const browserFs = { ...nodeFs };
  browserFs.constants = nodeFs.constants;

  browserFs.writeSync = (fd, buf) => {
    if (fd === 1 || fd === 2) {
      return writeConsole(buf);
    }
    return nodeFs.writeSync(fd, buf);
  };

  browserFs.write = (fd, buf, offset, length, position, callback) => {
    if (fd === 1 || fd === 2) {
      if (offset !== 0 || length !== buf.length || position !== null) {
        callback(enosys());
        return;
      }
      callback(null, browserFs.writeSync(fd, buf));
      return;
    }
    nodeFs.write(fd, buf, offset, length, position, callback);
  };

  browserFs.readFile = (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = 'utf8';
    } else if (options == null) {
      options = 'utf8';
    }
    nodeFs.readFile(toNativePath(path), options, callback);
  };

  browserFs.readFileSync = (path, options) => nodeFs.readFileSync(toNativePath(path), options ?? 'utf8');
  browserFs.writeFile = (path, data, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    if (options === undefined) {
      nodeFs.writeFile(toNativePath(path), data, callback);
      return;
    }
    nodeFs.writeFile(toNativePath(path), data, options, callback);
  };
  browserFs.writeFileSync = (path, data, options) => nodeFs.writeFileSync(toNativePath(path), data, options);

  browserFs.readdir = (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    if (options === undefined) {
      nodeFs.readdir(toNativePath(path), callback);
      return;
    }
    nodeFs.readdir(toNativePath(path), options, callback);
  };
  browserFs.readdirSync = (path, options) => nodeFs.readdirSync(toNativePath(path), options);

  browserFs.stat = (path, callback) => nodeFs.stat(toNativePath(path), callback);
  browserFs.statSync = (path) => nodeFs.statSync(toNativePath(path));
  browserFs.lstat = (path, callback) => nodeFs.lstat(toNativePath(path), callback);
  browserFs.lstatSync = (path) => nodeFs.lstatSync(toNativePath(path));
  browserFs.readlink = (path, callback) => nodeFs.readlink(toNativePath(path), callback);
  browserFs.readlinkSync = (path) => nodeFs.readlinkSync(toNativePath(path));
  browserFs.realpath = (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    if (options === undefined) {
      nodeFs.realpath(toNativePath(path), callback);
      return;
    }
    nodeFs.realpath(toNativePath(path), options, callback);
  };
  browserFs.realpathSync = (path, options) => nodeFs.realpathSync(toNativePath(path), options);

  browserFs.rename = (from, to, callback) => nodeFs.rename(toNativePath(from), toNativePath(to), callback);
  browserFs.renameSync = (from, to) => nodeFs.renameSync(toNativePath(from), toNativePath(to));
  browserFs.mkdir = (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    if (options === undefined) {
      nodeFs.mkdir(toNativePath(path), callback);
      return;
    }
    nodeFs.mkdir(toNativePath(path), options, callback);
  };
  browserFs.mkdirSync = (path, options) => nodeFs.mkdirSync(toNativePath(path), options);
  browserFs.rmdir = (path, callback) => nodeFs.rmdir(toNativePath(path), callback);
  browserFs.rmdirSync = (path) => nodeFs.rmdirSync(toNativePath(path));
  browserFs.unlink = (path, callback) => nodeFs.unlink(toNativePath(path), callback);
  browserFs.unlinkSync = (path) => nodeFs.unlinkSync(toNativePath(path));
  browserFs.utimes = (path, atime, mtime, callback) => nodeFs.utimes(toNativePath(path), atime, mtime, callback);
  browserFs.utimesSync = (path, atime, mtime) => nodeFs.utimesSync(toNativePath(path), atime, mtime);
  browserFs.symlink = (target, path, callback) => nodeFs.symlink(toNativePath(target), toNativePath(path), callback);
  browserFs.symlinkSync = (target, path) => nodeFs.symlinkSync(toNativePath(target), toNativePath(path));
  browserFs.truncate = (path, len, callback) => nodeFs.truncate(toNativePath(path), len, callback);
  browserFs.truncateSync = (path, len) => nodeFs.truncateSync(toNativePath(path), len);
  browserFs.chmod = (path, mode, callback) => nodeFs.chmod(toNativePath(path), mode, callback);
  browserFs.chmodSync = (path, mode) => nodeFs.chmodSync(toNativePath(path), mode);
  browserFs.chown = (path, uid, gid, callback) => nodeFs.chown(toNativePath(path), uid, gid, callback);
  browserFs.chownSync = (path, uid, gid) => nodeFs.chownSync(toNativePath(path), uid, gid);
  browserFs.fchmod = (fd, mode, callback) => nodeFs.fchmod(fd, mode, callback);
  browserFs.fchmodSync = (fd, mode) => nodeFs.fchmodSync(fd, mode);
  browserFs.fchown = (fd, uid, gid, callback) => nodeFs.fchown(fd, uid, gid, callback);
  browserFs.fchownSync = (fd, uid, gid) => nodeFs.fchownSync(fd, uid, gid);
  browserFs.fstat = (fd, callback) => nodeFs.fstat(fd, callback);
  browserFs.fstatSync = (fd) => nodeFs.fstatSync(fd);
  browserFs.fsync = (fd, callback) => nodeFs.fsync(fd, callback);
  browserFs.fsyncSync = (fd) => nodeFs.fsyncSync(fd);
  browserFs.ftruncate = (fd, len, callback) => nodeFs.ftruncate(fd, len, callback);
  browserFs.ftruncateSync = (fd, len) => nodeFs.ftruncateSync(fd, len);
  browserFs.access = (path, mode, callback) => {
    if (typeof mode === 'function') {
      callback = mode;
      mode = nodeFs.constants.F_OK;
    }
    nodeFs.access(toNativePath(path), mode, callback);
  };
  browserFs.accessSync = (path, mode) => nodeFs.accessSync(toNativePath(path), mode);
  browserFs.copyFile = (from, to, flags, callback) => {
    if (typeof flags === 'function') {
      callback = flags;
      flags = 0;
    }
    nodeFs.copyFile(toNativePath(from), toNativePath(to), flags, callback);
  };
  browserFs.copyFileSync = (from, to, flags) => nodeFs.copyFileSync(toNativePath(from), toNativePath(to), flags);

  browserFs.read = (fd, buffer, offset, length, position, callback) => {
    nodeFs.read(fd, buffer, offset, length, position, callback);
  };
  browserFs.readSync = (fd, buffer, offset, length, position) => nodeFs.readSync(fd, buffer, offset, length, position);
  browserFs.close = (fd, callback) => nodeFs.close(fd, callback);
  browserFs.closeSync = (fd) => nodeFs.closeSync(fd);

  browserFs.existsSync = (path) => nodeFs.existsSync(toNativePath(path));

  return browserFs;
};

global.self = globalThis;

const esbuild = require('esbuild-wasm/lib/browser.js');
const wasmPath = ${JSON.stringify(wasmFile)};
const wasmModule = new WebAssembly.Module(fs.readFileSync(wasmPath));

const defaultInitOptions = { wasmModule, worker: false };
let initPromise;

const BACKSLASH = String.fromCharCode(92);

const normalizeWindowsPath = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const browserPath = value.startsWith('/') && /^[A-Za-z]:\//.test(value.slice(1))
    ? value.slice(1)
    : value;

  return browserPath.split(BACKSLASH).join('/');
};

const denormalizeWindowsPath = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.startsWith('/') && /^[A-Za-z]:\//.test(value.slice(1))
    ? value.slice(1)
    : value;
};

const normalizeTree = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeTree);
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return value;
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = normalizeTree(child);
    }
    return next;
  }

  return normalizeWindowsPath(value);
};

const denormalizeTree = (value) => {
  if (Array.isArray(value)) {
    return value.map(denormalizeTree);
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return value;
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = denormalizeTree(child);
    }
    return next;
  }

  return denormalizeWindowsPath(value);
};

const wrapPlugin = (plugin) => {
  if (!plugin || typeof plugin !== 'object' || typeof plugin.setup !== 'function') {
    return plugin;
  }

  return {
    ...plugin,
    setup(build) {
      const wrappedBuild = new Proxy(build, {
        get(target, prop, receiver) {
          if (prop === 'initialOptions') {
            return denormalizeTree(target.initialOptions);
          }

          if (prop === 'onResolve') {
            return (options, callback) => target.onResolve(options, async (args) => {
              const result = await callback(denormalizeTree(args));
              return result == null ? result : normalizeTree(result);
            });
          }

          if (prop === 'onLoad') {
            return (options, callback) => target.onLoad(options, async (args) => {
              const result = await callback(denormalizeTree(args));
              return result == null ? result : normalizeTree(result);
            });
          }

          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });

      return plugin.setup(wrappedBuild);
    },
  };
};

const normalizeBuildOptions = (options) => {
  if (!options || typeof options !== 'object') {
    return options;
  }

  const next = { ...options };

  if (typeof next.absWorkingDir === 'string') next.absWorkingDir = normalizeWindowsPath(next.absWorkingDir);
  if (typeof next.outdir === 'string') next.outdir = normalizeWindowsPath(next.outdir);
  if (typeof next.outfile === 'string') next.outfile = normalizeWindowsPath(next.outfile);
  if (typeof next.tsconfig === 'string') next.tsconfig = normalizeWindowsPath(next.tsconfig);
  if (typeof next.sourcefile === 'string') next.sourcefile = normalizeWindowsPath(next.sourcefile);
  if (typeof next.resolveDir === 'string') next.resolveDir = normalizeWindowsPath(next.resolveDir);
  if (Array.isArray(next.inject)) next.inject = next.inject.map(normalizeWindowsPath);
  if (Array.isArray(next.nodePaths)) next.nodePaths = next.nodePaths.map(normalizeWindowsPath);
  if (Array.isArray(next.plugins)) next.plugins = next.plugins.map(wrapPlugin);

  if (Array.isArray(next.entryPoints)) {
    next.entryPoints = next.entryPoints.map((entryPoint) => {
      if (typeof entryPoint === 'string') return normalizeWindowsPath(entryPoint);
      if (entryPoint && typeof entryPoint === 'object') {
        const clone = { ...entryPoint };
        if (typeof clone.in === 'string') clone.in = normalizeWindowsPath(clone.in);
        if (typeof clone.out === 'string') clone.out = normalizeWindowsPath(clone.out);
        return clone;
      }
      return entryPoint;
    });
  } else if (next.entryPoints && typeof next.entryPoints === 'object') {
    next.entryPoints = Object.fromEntries(
      Object.entries(next.entryPoints).map(([key, entryPoint]) => [key, normalizeWindowsPath(entryPoint)])
    );
  }

  if (next.stdin && typeof next.stdin === 'object') {
    next.stdin = { ...next.stdin };
    if (typeof next.stdin.resolveDir === 'string') next.stdin.resolveDir = normalizeWindowsPath(next.stdin.resolveDir);
    if (typeof next.stdin.sourcefile === 'string') next.stdin.sourcefile = normalizeWindowsPath(next.stdin.sourcefile);
  }

  return next;
};

const normalizeResultPaths = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeResultPaths);
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return value;
  }

  if (value && typeof value === 'object') {
    const next = {};

    for (const [key, child] of Object.entries(value)) {
      if (key === 'inputs' || key === 'outputs') {
        next[key] = {};
        for (const [childKey, grandChild] of Object.entries(child ?? {})) {
          next[key][denormalizeWindowsPath(childKey)] = normalizeResultPaths(grandChild);
        }
        continue;
      }

      next[key] = normalizeResultPaths(child);
    }

    return next;
  }

  return denormalizeWindowsPath(value);
};

const ensureInit = (options) => {
  if (!initPromise) {
    initPromise = esbuild.initialize(options ? normalizeBuildOptions(options) : defaultInitOptions);
  }
  return initPromise;
};

const withInit = (fn) => async (...args) => {
  await ensureInit();
  return fn(...args);
};

const wrapContext = (ctx) => ({
  rebuild: async (...args) => normalizeResultPaths(await ctx.rebuild(...args)),
  watch: (...args) => ctx.watch(...args),
  serve: (...args) => ctx.serve(...args),
  cancel: (...args) => ctx.cancel(...args),
  dispose: (...args) => ctx.dispose(...args),
});

exports.version = esbuild.version;
exports.initialize = (options) => ensureInit(options);
exports.stop = esbuild.stop;
exports.build = async (options) => normalizeResultPaths(await withInit(esbuild.build)(normalizeBuildOptions(options)));
exports.buildSync = esbuild.buildSync;
exports.context = async (options) => wrapContext(await withInit(esbuild.context)(normalizeBuildOptions(options)));
exports.formatMessages = withInit(esbuild.formatMessages);
exports.formatMessagesSync = esbuild.formatMessagesSync;
exports.transform = async (input, options) => normalizeResultPaths(await withInit(esbuild.transform)(input, normalizeBuildOptions(options)));
exports.transformSync = esbuild.transformSync;
exports.analyzeMetafile = withInit(esbuild.analyzeMetafile);
exports.analyzeMetafileSync = esbuild.analyzeMetafileSync;
`;

try {
  if (!fs.existsSync(targetFile) || !fs.existsSync(wasmFile)) {
    process.exit(0);
  }

  const current = fs.readFileSync(targetFile, 'utf8');
  if (current === shim) {
    process.exit(0);
  }

  fs.writeFileSync(targetFile, shim, 'utf8');
} catch (error) {
  console.error('[patch-esbuild-browser] Failed:', error);
  process.exitCode = 1;
}
