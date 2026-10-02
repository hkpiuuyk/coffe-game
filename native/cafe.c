/* Browser game calculations. Compiled to WebAssembly without a C runtime. */
static int level(int value) { return value < 0 ? 0 : value > 3 ? 3 : value; }

double brew_step(double progress) {
    double next = progress + 4.5;
    return next > 100.0 ? 100.0 : next;
}
int brew_min(int machine_level) { return 55 - level(machine_level) * 5; }
int brew_max(int machine_level) { return 80 + level(machine_level) * 5; }
int brew_quality(double progress, int machine_level) {
    return progress >= brew_min(machine_level) && progress <= brew_max(machine_level) ? 100 : 35;
}
double patience_step(double patience, int decor_level) {
    double next = patience - 0.12 * (1.0 - level(decor_level) * 0.15);
    return next < 0.0 ? 0.0 : next;
}
int ingredient_cost(int base_cost, int supplier_level) {
    return (base_cost * (10 - level(supplier_level)) + 5) / 10;
}
