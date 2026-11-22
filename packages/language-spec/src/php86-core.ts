// Core declarations verified against PHP 8.6.0 reflection.
export const PHP_86_CORE_STUB = `
function clamp(mixed $value, mixed $min, mixed $max): mixed {}

enum SortDirection { case Ascending; case Descending; }

final class StreamPollHandle implements \\Io\\Poll\\Handle {
  /** @param resource $stream */
  public function __construct($stream) {}
  /** @return resource */
  public function getStream() {}
  public function isValid(): bool {}
}

namespace Time {
  final readonly class Duration {
    public int $seconds;
    public int $nanoseconds;
    public bool $negative;
    private function __construct() {}
    public function __unserialize(array $data): void {}
    public static function fromSeconds(int $seconds, int $nanoseconds = 0): Duration {}
    public static function fromNanoseconds(int $nanoseconds): Duration {}
    public static function fromMicroseconds(int $microseconds): Duration {}
    public static function fromMilliseconds(int $milliseconds): Duration {}
    public static function fromMinutes(int $minutes): Duration {}
    public static function fromHours(int $hours): Duration {}
    public static function fromIso8601DurationString(string $specification): Duration {}
    public function negate(): Duration {}
    public function absolute(): Duration {}
    public function add(Duration $duration): Duration {}
    public function sub(Duration $duration): Duration {}
    public function multiplyBy(int $factor): Duration {}
    public function divideBy(int $divisor): Duration {}
    public static function compare(Duration $a, Duration $b): int {}
  }
}

namespace Io {
  class IoException extends \\Exception {}
}

namespace Io\\Poll {
  enum Backend {
    case Auto; case Poll; case Epoll; case Kqueue; case EventPorts; case WSAPoll;
    /** @return list<Backend> */
    public static function getAvailableBackends(): array {}
    public function isAvailable(): bool {}
    public function supportsEdgeTriggering(): bool {}
  }

  enum Event {
    case Read; case Write; case Error; case HangUp; case ReadHangUp; case OneShot; case EdgeTriggered;
  }

  interface Handle {}

  final class Context {
    public function __construct(Backend $backend = Backend::Auto) {}
    /** @param array<array-key, Event> $events */
    public function add(Handle $handle, array $events, mixed $data = null): Watcher {}
    /** @return list<Watcher> */
    public function wait(?\\Time\\Duration $timeout = null, ?int $maxEvents = null): array {}
    public function getBackend(): Backend {}
  }

  final class Watcher {
    private function __construct() {}
    public function getHandle(): Handle {}
    /** @return list<Event> */
    public function getWatchedEvents(): array {}
    /** @return list<Event> */
    public function getTriggeredEvents(): array {}
    public function getData(): mixed {}
    public function hasTriggered(Event $event): bool {}
    public function isActive(): bool {}
    /** @param array<array-key, Event> $events */
    public function modify(array $events, mixed $data = null): void {}
    /** @param array<array-key, Event> $events */
    public function modifyEvents(array $events): void {}
    public function modifyData(mixed $data): void {}
    public function remove(): void {}
  }

  class PollException extends \\Io\\IoException {}
  class FailedPollOperationException extends PollException {}
  class FailedContextInitializationException extends FailedPollOperationException {}
  class FailedHandleAddException extends FailedPollOperationException {}
  class FailedWatcherModificationException extends FailedPollOperationException {}
  class FailedPollWaitException extends FailedPollOperationException {}
  class BackendUnavailableException extends PollException {}
  class InactiveWatcherException extends PollException {}
  class HandleAlreadyWatchedException extends PollException {}
  class InvalidHandleException extends PollException {}
}
`;
