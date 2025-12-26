/**
 * Module Loader
 * Автоматическая загрузка и регистрация модулей
 */
const fs = require('fs');
const path = require('path');

class ModuleLoader {
  constructor() {
    this.modules = [];
    this.modulesPath = path.join(__dirname, '../modules');
  }

  /**
   * Load all modules from /modules directory
   */
  async loadModules() {
    console.log('📦 Loading modules...');

    if (!fs.existsSync(this.modulesPath)) {
      console.warn('⚠️ Modules directory not found');
      return;
    }

    const moduleDirs = fs.readdirSync(this.modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const moduleName of moduleDirs) {
      try {
        await this.loadModule(moduleName);
      } catch (error) {
        console.error(`❌ Failed to load module "${moduleName}":`, error.message);
      }
    }

    console.log(`✅ Loaded ${this.modules.length} modules`);
  }

  /**
   * Load a single module
   */
  async loadModule(moduleName) {
    const modulePath = path.join(this.modulesPath, moduleName);
    const indexPath = path.join(modulePath, 'index.js');

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Module "${moduleName}" missing index.js`);
    }

    const module = require(indexPath);

    // Validate module structure
    if (!module.name) {
      throw new Error(`Module "${moduleName}" missing name property`);
    }

    this.modules.push({
      name: module.name,
      module: module,
      path: modulePath
    });

    console.log(`  ✓ ${module.name}`);
  }

  /**
   * Initialize all loaded modules
   */
  async initializeModules(app, io) {
    console.log('🚀 Initializing modules...');

    for (const { name, module } of this.modules) {
      try {
        // Register routes if provided (unless skipRouteRegistration is true)
        if (module.routes && !module.skipRouteRegistration) {
          const prefix = module.routePrefix || `/api/${name}`;
          app.use(prefix, module.routes);
          console.log(`  ✓ Routes registered: ${prefix}`);
        }

        // Initialize module if it has init function
        if (module.initialize && typeof module.initialize === 'function') {
          await module.initialize(app, io);
          
          // Не выводим отдельное сообщение если модуль сам выводит
          if (!module.skipRouteRegistration) {
            console.log(`  ✓ ${name} initialized`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to initialize module "${name}":`, error.message);
      }
    }

    console.log(`✅ ${this.modules.length} modules initialized`);
  }

  /**
   * Get specific module by name
   */
  getModule(name) {
    const found = this.modules.find(m => m.name === name);
    return found ? found.module : null;
  }

  /**
   * Get all loaded modules
   */
  getModules() {
    return this.modules;
  }
}

module.exports = new ModuleLoader();
