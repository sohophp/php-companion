# @php-companion/provider-symfony-controller-contexts

Authoritative, separately publishable Symfony controller-to-template context provider for PHP Companion.

It statically analyzes literal `$this->render()` calls in a bounded Composer project source snapshot. It consumes open PHP snapshots without booting Symfony, executing project PHP, loading the project autoloader, or implementing Twig syntax and editor services. Twig ownership remains with twig-plus.
